var HTTPParser = require('http-parser-js').HTTPParser;

var IncomingMessage = require('./incoming-message.qtscript').ServerIncomingMessage;

// This is a free list to avoid creating so many of the same object.
function FreeList(name, max, constructor) {
  this.name = name;
  this.constructor = constructor;
  this.max = max;
  this.list = [];
};

FreeList.prototype.alloc = function() {
  return this.list.length ? this.list.pop() :
                            this.constructor.apply(this, arguments);
};

FreeList.prototype.free = function(obj) {
  if (this.list.length < this.max) {
    this.list.push(obj);
    return true;
  }
  return false;
};

exports.debug = function (message) {
  //console.log(message);
};

exports.CRLF = '\r\n';
exports.chunkExpression = /chunk/i;
exports.continueExpression = /100-continue/i;
exports.methods = HTTPParser.methods;

var kOnHeaders = HTTPParser.kOnHeaders | 0;
var kOnHeadersComplete = HTTPParser.kOnHeadersComplete | 0;
var kOnBody = HTTPParser.kOnBody | 0;
var kOnMessageComplete = HTTPParser.kOnMessageComplete | 0;
var kOnExecute = HTTPParser.kOnExecute | 0;

// Only called in the slow case where slow means
// that the request headers were either fragmented
// across multiple TCP packets or too large to be
// processed in a single run. This method is also
// called to process trailing HTTP headers.
function parserOnHeaders(headers, url) {
  // Once we exceeded headers limit - stop collecting them
  if (this.maxHeaderPairs <= 0 ||
      this._headers.length < this.maxHeaderPairs) {
    this._headers = this._headers.concat(headers);
  }
  this._url += url;
}

// `headers` and `url` are set only if .onHeaders() has not been called for
// this request.
// `url` is not set for response parsers but that's not applicable here since
// all our parsers are request parsers.
function parserOnHeadersComplete(versionMajor, versionMinor, headers, method,
                                 url, statusCode, statusMessage, upgrade,
                                 shouldKeepAlive) {
  var parser = this;

  if (!headers) {
    headers = parser._headers;
    parser._headers = [];
  }

  if (!url) {
    url = parser._url;
    parser._url = '';
  }

  parser.incoming = new IncomingMessage(parser.socket);
  parser.incoming.httpVersionMajor = versionMajor;
  parser.incoming.httpVersionMinor = versionMinor;
  parser.incoming.httpVersion = versionMajor + '.' + versionMinor;
  parser.incoming.url = url;

  var n = headers.length;

  // If parser.maxHeaderPairs <= 0 assume that there's no limit.
  if (parser.maxHeaderPairs > 0)
    n = Math.min(n, parser.maxHeaderPairs);

  parser.incoming._addHeaderLines(headers, n);

  if (typeof method === 'number') {
    // server only
    parser.incoming.method = HTTPParser.methods[method];
  } else {
    // client only
    parser.incoming.statusCode = statusCode;
    parser.incoming.statusMessage = statusMessage;
  }

  // The client made non-upgrade request, and server is just advertising
  // supported protocols.
  //
  // See RFC7230 Section 6.7
  //
  // NOTE: RegExp below matches `upgrade` in `Connection: abc, upgrade, def`
  // header.
  if (upgrade &&
      parser.outgoing !== null &&
      (parser.outgoing._headers.upgrade === undefined ||
       !/(^|\W)upgrade(\W|$)/i.test(parser.outgoing._headers.connection))) {
    upgrade = false;
  }

  parser.incoming.upgrade = upgrade;

  var skipBody = false; // response to HEAD or CONNECT

  if (!upgrade) {
    // For upgraded connections and CONNECT method request, we'll emit this
    // after parser.execute so that we can capture the first part of the new
    // protocol.
    skipBody = parser.onIncoming(parser.incoming, shouldKeepAlive);
  }

  return skipBody;
}

// XXX This is a mess.
// TODO: http.Parser should be a Writable emits request/response events.
function parserOnBody(b, start, len) {
  var parser = this;
  var stream = parser.incoming;

  // if the stream has already been removed, then drop it.
  if (!stream)
    return;

  var socket = stream.socket;

  // pretend this was the result of a stream._read call.
  if (len > 0 && !stream._dumped) {
    var slice = b.slice(start, start + len);
    var ret = stream.push(slice);
    if (!ret)
      readStop(socket);
  }
}

function parserOnMessageComplete() {
  var parser = this;
  var stream = parser.incoming;

  if (stream) {
    stream.complete = true;
    // Emit any trailing headers.
    var headers = parser._headers;
    if (headers) {
      parser.incoming._addHeaderLines(headers, headers.length);
      parser._headers = [];
      parser._url = '';
    }

    // Not needed for Qt
    // For emit end event
    //stream.push(null);
  }

  // Not needed for Qt
  // force to read the next incoming message
  //readStart(parser.socket);
}

var parsers = new FreeList('parsers', 1000, function() {
  var parser = new HTTPParser(HTTPParser.REQUEST);

  parser._headers = [];
  parser._url = '';
  parser._consumed = false;

  parser.socket = null;
  parser.incoming = null;
  parser.outgoing = null;

  // Only called in the slow case where slow means
  // that the request headers were either fragmented
  // across multiple TCP packets or too large to be
  // processed in a single run. This method is also
  // called to process trailing HTTP headers.
  parser[kOnHeaders] = parserOnHeaders;
  parser[kOnHeadersComplete] = parserOnHeadersComplete;
  parser[kOnBody] = parserOnBody;
  parser[kOnMessageComplete] = parserOnMessageComplete;
  parser[kOnExecute] = null;

  return parser;
});
exports.parsers = parsers;

// Free the parser and also break any links that it
// might have to any other things.
// TODO: All parser data should be attached to a
// single object, so that it can be easily cleaned
// up by doing `parser.data = {}`, which should
// be done in FreeList.free.  `parsers.free(parser)`
// should be all that is needed.
function freeParser(parser, req, socket) {
  if (parser) {
    parser._headers = [];
    parser.onIncoming = null;
    if (parser._consumed)
      parser.unconsume();
    parser._consumed = false;
    if (parser.socket)
      parser.socket.parser = null;
    parser.socket = null;
    parser.incoming = null;
    parser.outgoing = null;
    parser[kOnExecute] = null;
    if (parsers.free(parser) === false)
      parser.close();
    parser = null;
  }
  if (req) {
    req.parser = null;
  }
  if (socket) {
    socket.parser = null;
  }
}
exports.freeParser = freeParser;

function ondrain() {
  if (this._httpMessage) this._httpMessage.emit('drain');
}

function httpSocketSetup(socket) {
  socket.removeListener('drain', ondrain);
  socket.on('drain', ondrain);
}
exports.httpSocketSetup = httpSocketSetup;

/**
 * Verifies that the given val is a valid HTTP token
 * per the rules defined in RFC 7230
 **/
var token = /^[a-zA-Z0-9_!#$%&'*+.^`|~-]+$/;
function checkIsHttpToken(val) {
  return typeof val === 'string' && token.test(val);
}
exports._checkIsHttpToken = checkIsHttpToken;

/**
 * True if val contains an invalid field-vchar
 *  field-value    = *( field-content / obs-fold )
 *  field-content  = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 *  field-vchar    = VCHAR / obs-text
 **/
function checkInvalidHeaderChar(val) {
  val = '' + val;
  for (var i = 0; i < val.length; i++) {
    var ch = val.charCodeAt(i);
    if (ch === 9) continue;
    if (ch <= 31 || ch > 255 || ch === 127) return true;
  }
  return false;
}
exports._checkInvalidHeaderChar = checkInvalidHeaderChar;
