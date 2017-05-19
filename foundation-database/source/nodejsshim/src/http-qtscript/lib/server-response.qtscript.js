var assert = require('assert').ok;
var util = require('util');

var utils = require('./utils.qtscript');
var OutgoingMessage = require('./outgoing-message.qtscript');
var STATUS_CODES = utils.STATUS_CODES;

var CRLF = '\r\n';

/**
 * Emulate Node.js's `http.ServerResponse` class.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_class_http_serverresponse
 */
function ServerResponse(req) {
  var self = this;
  OutgoingMessage.call(this);

  if (req.method === 'HEAD') this._hasBody = false;

  this.sendDate = true;

  if (req.httpVersionMajor < 1 || req.httpVersionMinor < 1) {
    this.useChunkedEncodingByDefault = chunkExpression.test(req.headers.te);
    this.shouldKeepAlive = false;
  }

  return this;
}

util.inherits(ServerResponse, OutgoingMessage);

ServerResponse.prototype.statusCode = 200;
ServerResponse.prototype.statusMessage = undefined;

function onServerResponseClose() {
  // EventEmitter.emit makes a copy of the 'close' listeners array before
  // calling the listeners. detachSocket() unregisters onServerResponseClose
  // but if detachSocket() is called, directly or indirectly, by a 'close'
  // listener, onServerResponseClose is still in that copy of the listeners
  // array. That is, in the example below, b still gets called even though
  // it's been removed by a:
  //
  //   var EventEmitter = require('events');
  //   var obj = new EventEmitter();
  //   obj.on('event', a);
  //   obj.on('event', b);
  //   function a() { obj.removeListener('event', b) }
  //   function b() { throw "BAM!" }
  //   obj.emit('event');  // throws
  //
  // Ergo, we need to deal with stale 'close' events and handle the case
  // where the ServerResponse object has already been deconstructed.
  // Fortunately, that requires only a single if check. :-)
  if (this._httpMessage) this._httpMessage.emit('close');
}

ServerResponse.prototype.assignSocket = function(socket) {
  assert(!socket._httpMessage);
  socket._httpMessage = this;
  socket.on('close', onServerResponseClose);
  this.socket = socket;
  this.connection = socket;
  this.emit('socket', socket);
  //this._flush();
};

ServerResponse.prototype.detachSocket = function(socket) {
  assert(socket._httpMessage === this);
  socket.removeListener('close', onServerResponseClose);
  socket._httpMessage = null;
  this.socket = this.connection = null;
};

ServerResponse.prototype.writeContinue = function(cb) {
  this.socket.write('HTTP/1.1 100 Continue' + CRLF + CRLF, 'ascii', cb);
  //this._writeRaw('HTTP/1.1 100 Continue' + CRLF + CRLF, 'ascii', cb);
  this._sent100 = true;
};

ServerResponse.prototype._implicitHeader = function() {
  this.writeHead(this.statusCode);
};

ServerResponse.prototype.writeHead = function(statusCode, reason, obj) {
  var headers;

  if (typeof reason === 'string') {
    // writeHead(statusCode, reasonPhrase[, headers])
    this.statusMessage = reason;
  } else {
    // writeHead(statusCode[, headers])
    this.statusMessage =
        this.statusMessage || STATUS_CODES[statusCode] || 'unknown';
    obj = reason;
  }
  this.statusCode = statusCode;

  if (this._headers) {
    // Slow-case: when progressive API and header fields are passed.
    if (obj) {
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k) this.setHeader(k, obj[k]);
      }
    }
    // only progressive api is used
    headers = this._renderHeaders();
  } else {
    // only writeHead() called
    headers = obj;
  }

  var statusLine = 'HTTP/1.1 ' + statusCode.toString() + ' ' +
                   this.statusMessage + CRLF;

  if (statusCode === 204 || statusCode === 304 ||
      (100 <= statusCode && statusCode <= 199)) {
    // RFC 2616, 10.2.5:
    // The 204 response MUST NOT include a message-body, and thus is always
    // terminated by the first empty line after the header fields.
    // RFC 2616, 10.3.5:
    // The 304 response MUST NOT contain a message-body, and thus is always
    // terminated by the first empty line after the header fields.
    // RFC 2616, 10.1 Informational 1xx:
    // This class of status code indicates a provisional response,
    // consisting only of the Status-Line and optional headers, and is
    // terminated by an empty line.
    this._hasBody = false;
  }

  // don't keep alive connections where the client expects 100 Continue
  // but we sent a final status; they may put extra bytes on the wire.
  if (this._expect_continue && !this._sent100) {
    this.shouldKeepAlive = false;
  }

  this._storeHeader(statusLine, headers);
};

ServerResponse.prototype.writeHeader = function() {
  this.writeHead.apply(this, arguments);
};

module.exports = ServerResponse;
