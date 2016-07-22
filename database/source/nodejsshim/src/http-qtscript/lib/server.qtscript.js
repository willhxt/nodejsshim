var assert = require('assert').ok;
var EventEmitter = require('events').EventEmitter;
var net = require('net');
var util = require('util');
var HTTPParser = require('http-parser-js').HTTPParser;

var ServerResponse = require('./server-response.qtscript');
var common = require('./common');

var debug = common.debug;
var freeParser = common.freeParser;
var httpSocketSetup = common.httpSocketSetup;
var kOnExecute = HTTPParser.kOnExecute | 0;
var parsers = common.parsers;

/**
 * Emulate Node.js's `http.Server` class.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_class_http_server
 */
function Server(requestListener) {
  var self = this;

  if (!(this instanceof Server)) return new Server(requestListener);
  net.Server.call(this, { allowHalfOpen: true });

  if (requestListener) {
    this.addListener('request', requestListener);
  }

  /* eslint-disable max-len */
  // Similar option to this. Too lazy to write my own docs.
  // http://www.squid-cache.org/Doc/config/half_closed_clients/
  // http://wiki.squid-cache.org/SquidFaq/InnerWorkings#What_is_a_half-closed_filedescriptor.3F
  /* eslint-enable max-len */
  this.httpAllowHalfOpen = false;

  this.addListener('connection', connectionListener);

  this.addListener('clientError', function(err, conn) {
    conn.destroy(err);
  });

  this.timeout = 2 * 60 * 1000;

  this._pendingResponseData = 0;

  return this;
}
util.inherits(Server, net.Server);

Server.prototype.setTimeout = function(msecs, callback) {
  this.timeout = msecs;
  if (callback)
    this.on('timeout', callback);
  return this;
};

// TODO: Implement parser.
function connectionListener(socket) {
  var self = this;
  var outgoing = [];
  var incoming = [];
  var outgoingData = 0;


  function updateOutgoingData(delta) {
    // `outgoingData` is an approximate amount of bytes queued through all
    // inactive responses. If more data than the high watermark is queued - we
    // need to pause TCP socket/HTTP parser, and wait until the data will be
    // sent to the client.
    outgoingData += delta;
    // Not needed in Qt
    //if (socket._paused && outgoingData < socket._writableState.highWaterMark)
    //  return socketOnDrain();
  }

  function abortIncoming() {
    while (incoming.length) {
      var req = incoming.shift();
      req.emit('aborted');
      req.emit('close');
    }
    // abort socket._httpMessage ?
  }

  function serverSocketCloseListener() {
    debug('server socket close');
    // mark this parser as reusable
    if (this.parser) {
      freeParser(this.parser, null, this);
    }

    abortIncoming();
  }

  debug('SERVER new http connection');

  httpSocketSetup(socket);

  // If the user has added a listener to the server,
  // request, or response, then it's their responsibility.
  // otherwise, destroy on timeout by default
  if (self.timeout)
    socket.setTimeout(self.timeout);

  socket.on('timeout', function() {
    var req = socket.parser && socket.parser.incoming;
    var reqTimeout = req && !req.complete && req.emit('timeout', socket);
    var res = socket._httpMessage;
    var resTimeout = res && res.emit('timeout', socket);
    var serverTimeout = self.emit('timeout', socket);

    if (!reqTimeout && !resTimeout && !serverTimeout)
      socket.destroy();
  });

  var parser = parsers.alloc();
  parser.reinitialize(HTTPParser.REQUEST);
  parser.socket = socket;
  socket.parser = parser;
  parser.incoming = null;

  // Propagate headers limit from server instance to parser
  if (typeof this.maxHeadersCount === 'number') {
    parser.maxHeaderPairs = this.maxHeadersCount << 1;
  } else {
    // Set default value because parser may be reused from FreeList
    parser.maxHeaderPairs = 2000;
  }

  socket.addListener('error', socketOnError);
  socket.addListener('close', serverSocketCloseListener);
  parser.onIncoming = parserOnIncoming;
  socket.on('end', socketOnEnd);
  socket.on('data', socketOnData);

  // We are consuming socket, so it won't get any actual data
  socket.on('resume', onSocketResume);
  socket.on('pause', onSocketPause);

  socket.on('drain', socketOnDrain);

  // Override on to unconsume on `data`, `readable` listeners
  socket.on = socketOnWrap;

  /*
  var external = socket._handle._externalStream;
  if (external) {
    parser._consumed = true;
    parser.consume(external);
  }
  external = null;
  */
  parser[kOnExecute] = onParserExecute;

  // TODO(isaacs): Move all these functions out of here
  function socketOnError(e) {
    self.emit('clientError', e, this);
  }

  function socketOnData(d) {
    assert(!socket._paused);
    debug('SERVER socketOnData %d', d.length);
    var ret = parser.execute(d);

    onParserExecuteCommon(ret, d);
  }

  function onParserExecute(ret, d) {
    debug('SERVER socketOnParserExecute %d', ret);
    onParserExecuteCommon(ret, undefined);
  }

  function onParserExecuteCommon(ret, d) {
    if (ret instanceof Error) {
      debug('parse error');
      socket.destroy(ret);
    } else if (parser.incoming && parser.incoming.upgrade) {
      // Upgrade or CONNECT
      var bytesParsed = ret;
      var req = parser.incoming;
      debug('SERVER upgrade or connect', req.method);

      if (!d)
        d = parser.getCurrentBuffer();

      socket.removeListener('data', socketOnData);
      socket.removeListener('end', socketOnEnd);
      socket.removeListener('close', serverSocketCloseListener);
      unconsume(parser, socket);
      parser.finish();
      freeParser(parser, req, null);
      parser = null;

      var eventName = req.method === 'CONNECT' ? 'connect' : 'upgrade';
      if (EventEmitter.listenerCount(self, eventName) > 0) {
        debug('SERVER have listener for %s', eventName);
        var bodyHead = d.slice(bytesParsed, d.length);

        // TODO(isaacs): Need a way to reset a stream to fresh state
        // IE, not flowing, and not explicitly paused.
        // Not needed in Qt
        //socket._readableState.flowing = null;
        self.emit(eventName, req, socket, bodyHead);
      } else {
        // Got upgrade header or CONNECT method, but have no handler.
        socket.destroy();
      }
    }

    if (socket._paused && socket.parser) {
      // onIncoming paused the socket, we should pause the parser as well
      debug('pause parser');
      socket.parser.pause();
    }
  }

  function socketOnEnd() {
    var socket = this;
    var ret = parser.finish();

    if (ret instanceof Error) {
      debug('parse error');
      socket.destroy(ret);
      return;
    }

    if (!self.httpAllowHalfOpen) {
      abortIncoming();
      if (socket.writable) socket.end();
    } else if (outgoing.length) {
      outgoing[outgoing.length - 1]._last = true;
    } else if (socket._httpMessage) {
      socket._httpMessage._last = true;
    } else {
      if (socket.writable) socket.end();
    }
  }


  // The following callback is issued after the headers have been read on a
  // new message. In this callback we setup the response object and pass it
  // to the user.

  socket._paused = false;
  function socketOnDrain() {
    // Not needed in Qt
    var needPause = false;
    //var needPause = outgoingData > socket._writableState.highWaterMark;

    // If we previously paused, then start reading again.
    if (socket._paused && !needPause) {
      socket._paused = false;
      if (socket.parser)
        socket.parser.resume();
      socket.resume();
    }
  }

  function parserOnIncoming(req, shouldKeepAlive) {
    incoming.push(req);

    // TODO: Do not need this with QTcpSocket.
    // If the writable end isn't consuming, then stop reading
    // so that we don't become overwhelmed by a flood of
    // pipelined requests that may never be resolved.
    /*
    if (!socket._paused) {
      var needPause = socket._writableState.needDrain ||
          outgoingData >= socket._writableState.highWaterMark;
      if (needPause) {
        socket._paused = true;
        // We also need to pause the parser, but don't do that until after
        // the call to execute, because we may still be processing the last
        // chunk.
        socket.pause();
      }
    }
    */

    var res = new ServerResponse(req);
    res._onPendingData = updateOutgoingData;

    res.shouldKeepAlive = shouldKeepAlive;
    //DTRACE_HTTP_SERVER_REQUEST(req, socket);
    //LTTNG_HTTP_SERVER_REQUEST(req, socket);
    //COUNTER_HTTP_SERVER_REQUEST();

    if (socket._httpMessage) {
      // There are already pending outgoing res, append.
      outgoing.push(res);
    } else {
      res.assignSocket(socket);
    }

    // When we're finished writing the response, check if this is the last
    // response, if so destroy the socket.
    res.on('finish', resOnFinish);
    function resOnFinish() {
      // Usually the first incoming element should be our request.  it may
      // be that in the case abortIncoming() was called that the incoming
      // array will be empty.
      assert(incoming.length === 0 || incoming[0] === req);

      incoming.shift();

      // if the user never called req.read(), and didn't pipe() or
      // .resume() or .on('data'), then we call req._dump() so that the
      // bytes will be pulled off the wire.
      // Not needed in Qt
      //if (!req._consuming && !req._readableState.resumeScheduled)
      //  req._dump();

      // Not needed in Qt.
      //res.detachSocket(socket);

      if (res._last) {
        socket.destroySoon();
      } else {
        // start sending the next message
        var m = outgoing.shift();
        if (m) {
          m.assignSocket(socket);
        }
      }
    }

    if (req.headers.expect !== undefined &&
        (req.httpVersionMajor == 1 && req.httpVersionMinor == 1) &&
        continueExpression.test(req.headers['expect'])) {
      res._expect_continue = true;
      if (EventEmitter.listenerCount(self, 'checkContinue') > 0) {
        self.emit('checkContinue', req, res);
      } else {
        res.writeContinue();
        self.emit('request', req, res);
      }
    } else {
      self.emit('request', req, res);
    }
    return false; // Not a HEAD response. (Not even a response!)
  }
}
exports._connectionListener = connectionListener;

function onSocketResume() {
  // It may seem that the socket is resumed, but this is an enemy's trick to
  // deceive us! `resume` is emitted asynchronously, and may be called from
  // `incoming.readStart()`. Stop the socket again here, just to preserve the
  // state.
  //
  // We don't care about stream semantics for the consumed socket anyway.
  if (this._paused) {
    this.pause();
    return;
  }

  if (this._handle && !this._handle.reading) {
    this._handle.reading = true;
    this._handle.readStart();
  }
}

function onSocketPause() {
  if (this._handle && this._handle.reading) {
    this._handle.reading = false;
    this._handle.readStop();
  }
}

function unconsume(parser, socket) {
  if (socket._handle) {
    if (parser._consumed)
      parser.unconsume(socket._handle._externalStream);
    parser._consumed = false;
    socket.removeListener('pause', onSocketPause);
    socket.removeListener('resume', onSocketResume);
  }
}

function socketOnWrap(ev, fn) {
  var res = net.Socket.prototype.on.call(this, ev, fn);
  if (!this.parser) {
    this.on = net.Socket.prototype.on;
    return res;
  }

  if (ev === 'data' || ev === 'readable')
    unconsume(this.parser, this);

  return res;
}

module.exports = Server;
