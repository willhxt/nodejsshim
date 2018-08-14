var EventEmitter = require('events').EventEmitter;
var util = require('util');

var utils = require('./utils.qtscript');

/**
 * Emulate Node.js's `http.IncomingMessage` class using Qt's QNetworkReply class.
 * This is used by http.ClientRequest.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_class_http_incomingmessage
 *
 * @param {Object} [options] - The socket connection options.
 */
function ClientIncomingMessage(requestHandler, qNetworkRequest) {
  this.QNetworkRequest = qNetworkRequest;
  var self = this;

  this.complete = false;
  this.hasData = false;
  this.receivedData = false;
  this.setMetaData = false;
  this.isReading = false;
  this._encoding = 'utf8';
  this.readable = true;
  this.httpVersionMajor = null;
  this.httpVersionMinor = null;
  this._timer = false;
  this._timeout = 60 * 1000;
  this._idleTime = Date.now() + this._timeout;

  this.port = this.QNetworkRequest.url().port();
  this.data = null;
  this.headers = {};
  this.httpVersion = null;
  this.rawHeaders = [];
  this.rawTrailers = [];
  this.statusCode = null;
  this.statusMessage = null;
  this.trailers = {};

  this._requestHandler = function (data) {
    self.QNetworkReply = requestHandler(data);

    self.QNetworkReply["error(QNetworkReply::NetworkError)"].connect(_isError);
    self.QNetworkReply["metaDataChanged()"].connect(_isMetaDataChanged);
    self.QNetworkReply["downloadProgress(qint64, qint64)"].connect(_isDownloading);
    self.QNetworkReply["readyRead()"].connect(_isReadyRead);
    self.QNetworkReply["bytesWritten(qint64)"].connect(_isBytesWritten);
    self.QNetworkReply["finished()"].connect(_isFinished);
  };

  function _isDownloading (bytesReceived, bytesTotal) {
    if (bytesTotal !== 0) {
      self.hasData = true;
    }
  }

  function _isFinished () {
    self.readable = false;
    self.complete = true;

    // Sometimes `QNetworkReply` emits `finished()` before `readyRead()`, so we
    // use a setInterval loop to only emit `close` and `end` when we're really done.
    var timer = setInterval(function () {
      if (!self.hasData && !self.isReading && self.receivedData && self.setMetaData) {
        clearInterval(timer);

        if (self._timer) {
          self.setTimeout(0);
        }
        self.removeAllListeners('timeout');
        self.QNetworkReply.deleteLater();

        self.emit('close');
        self.emit('end');
      }
    }, 5);
  }
  function _isError (code) {
    if (code === 0) {
      return;
    }
    self._idleTime = Date.now() + self._timeout;
    self.QtQAbstractSocketSocketError = code;

    if (self._timer) {
      self.setTimeout(0);
    }
    self.removeAllListeners('timeout');
    self.QNetworkReply.deleteLater();

    self.emit('close');
  }
  function _readData () {
    var size = self.QNetworkReply.bytesAvailable();
    if (size > 0) {
      self.isReading = true;
      self._idleTime = Date.now() + self._timeout;

      var qba = self.QNetworkReply.readAll();
      var data = utils._convertQByteArrayToEncoding(qba, self._encoding);
      self.emit('data', data);
      setTimeout(function () { _readData(size);}, 0);
    } else {
      self.isReading = false;
      self.hasData = false;
    }

    self.receivedData = true;
  }
  function _isReadyRead () {
    if (!self.isReading) {
      self.emit('response', self);
      setTimeout(_readData, 0);
    }
  }
  function _isMetaDataChanged () {
    self.headers = self.QNetworkReply.rawHeaderList().reduce(
                     function (previousValue, currentValue) {
                       if (self.QNetworkReply.hasRawHeader(QByteArray(currentValue))) {
                         previousValue[currentValue] = self.QNetworkReply.rawHeader(QByteArray(currentValue)).toString();
                       }
                       return previousValue;
                     },
                     {} // Initial value.
                   );
    self.statusCode = self.QNetworkReply.attribute(QNetworkRequest.HttpStatusCodeAttribute);
    self.statusMessage = self.QNetworkReply.attribute(QNetworkRequest.HttpReasonPhraseAttribute);

    self.setMetaData = true;
  }
  function _isBytesWritten(bytes) {
    self._idleTime = Date.now() + self._timeout;
    self.bytesWritten = bytes;
    self.emit('drain');
  }

  // QNetworkAccessManager doesn't open a socket and wait. So we have to
  // emit 'socket' first and then 'connect' or 'secureConnect' from
  // `ClientRequest` after a small delay.
  setTimeout(function () {
    self.emit('socket', self);
  }, 5);

  return this;
}

util.inherits(ClientIncomingMessage, EventEmitter);

/**
 * Execute the pending request.
 */
ClientIncomingMessage.prototype.executeRequest = function executeRequest () {
  this._requestHandler(this.data);
};

/**
 * Emulate Node.js's IncomingMessage `message.setEncoding(encoding)` method.
 */
ClientIncomingMessage.prototype.setEncoding = function setEncoding (encoding) {
  this._encoding = encoding;
};

/**
 * Emulate Node.js's IncomingMessage `message.setTimeout(msecs, callback)` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_message_settimeout_msecs_callback
 *
 * @param {Number} msecs - Sets the socket to timeout after timeout milliseconds
 *   of inactivity on the socket.
 * @param {Function} [callback] - The function to call when the idle timeout is reached.
 * @return {IncomingMessage}
 */
ClientIncomingMessage.prototype.setTimeout = function setTimeout (msecs, callback) {
  var self = this;

  if (self._timer && msecs === 0) {
    clearInterval(self._timer);
  } else {
    if (callback) {
      self.once('timeout', callback);
    }
    self._timeout = msecs;
    self._idleTime = Date.now() + self._timeout;

    // Once a second, check if we hit the idle timeout.
    self._timer = setInterval(function () {
      if (self._idleTime < Date.now()) {
        self.emit('timeout');
      }
    }, 1000);
  }

  return this;
};

function readStart(socket) {
  if (socket && !socket._paused && socket.readable)
    socket.resume();
}

/**
 * Emulate Node.js's `http.IncomingMessage` class using Qt's QTcpSocket class.
 * This is used by http.Server.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_class_http_incomingmessage
 *
 * @param {Object} [options] - The socket connection options.
 */
function ServerIncomingMessage(socket) {
  var self = this;

  this.complete = false;
  this.connection = socket;
  this.headers = {};
  this.httpVersion = null;
  this.httpVersionMajor = null;
  this.httpVersionMinor = null;
  this.method = null;
  this.rawHeaders = [];
  this.rawTrailers = [];
  this.readable = true;
  this.socket = socket;
  this.trailers = {};
  this.upgrade = null;
  this.url = '';

  // flag for when we decide that this message cannot possibly be
  // read by the user, so there's no point continuing to handle it.
  this._dumped = false;

  return this;
}

util.inherits(ServerIncomingMessage, EventEmitter);

/**
 * Emulate Node.js's IncomingMessage `message.setTimeout(msecs, callback)` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_message_settimeout_msecs_callback
 *
 * @param {Number} msecs - Sets the socket to timeout after timeout milliseconds
 *   of inactivity on the socket.
 * @param {Function} [callback] - The function to call when the idle timeout is reached.
 * @return {ServerIncomingMessage}
 */
ServerIncomingMessage.prototype.setTimeout = function setTimeout (msecs, callback) {
  if (callback) {
    this.on('timeout', callback);
  }
  this.socket.setTimeout(msecs);
  return this;
};

ServerIncomingMessage.prototype.read = function(n) {
  // TODO: Don't use Stream
  //this._consuming = true;
  //this.read = Stream.Readable.prototype.read;
  //return this.read(n);
  console.warn("ServerIncomingMessage.prototype.read() called, but it is not implemented in Qt Script yet.");
  return;
};

ServerIncomingMessage.prototype._read = function(n) {
  // We actually do almost nothing here, because the parserOnBody
  // function fills up our internal buffer directly.  However, we
  // do need to unpause the underlying socket so that it flows.
  if (this.socket.readable)
    readStart(this.socket);
};

// It's possible that the socket will be destroyed, and removed from
// any messages, before ever calling this.  In that case, just skip
// it, since something else is destroying this connection anyway.
ServerIncomingMessage.prototype.destroy = function(error) {
  if (this.socket)
    this.socket.destroy(error);
};

ServerIncomingMessage.prototype._addHeaderLines = function(headers, n) {
  if (headers && headers.length) {
    var raw, dest;
    if (this.complete) {
      raw = this.rawTrailers;
      dest = this.trailers;
    } else {
      raw = this.rawHeaders;
      dest = this.headers;
    }

    for (var i = 0; i < n; i += 2) {
      var k = headers[i];
      var v = headers[i + 1];
      raw.push(k);
      raw.push(v);
      this._addHeaderLine(k, v, dest);
    }
  }
};

// Add the given (field, value) pair to the message
//
// Per RFC2616, section 4.2 it is acceptable to join multiple instances of the
// same header with a ', ' if the header in question supports specification of
// multiple values this way. If not, we declare the first instance the winner
// and drop the second. Extended header fields (those beginning with 'x-') are
// always joined.
ServerIncomingMessage.prototype._addHeaderLine = function(field, value, dest) {
  field = field.toLowerCase();
  switch (field) {
    // Array headers:
    case 'set-cookie':
      if (dest[field] !== undefined) {
        dest[field].push(value);
      } else {
        dest[field] = [value];
      }
      break;

    /* eslint-disable max-len */
    // list is taken from:
    // https://mxr.mozilla.org/mozilla/source/netwerk/protocol/http/src/nsHttpHeaderArray.cpp
    /* eslint-enable max-len */
    case 'content-type':
    case 'content-length':
    case 'user-agent':
    case 'referer':
    case 'host':
    case 'authorization':
    case 'proxy-authorization':
    case 'if-modified-since':
    case 'if-unmodified-since':
    case 'from':
    case 'location':
    case 'max-forwards':
      // drop duplicates
      if (dest[field] === undefined)
        dest[field] = value;
      break;

    default:
      // make comma-separated list
      if (typeof dest[field] === 'string') {
        dest[field] += ', ' + value;
      } else {
        dest[field] = value;
      }
  }
};

// Call this instead of resume() if we want to just
// dump all the data to /dev/null
ServerIncomingMessage.prototype._dump = function() {
  if (!this._dumped) {
    this._dumped = true;
    this.resume();
  }
};

module.exports = {
  ClientIncomingMessage: ClientIncomingMessage,
  ServerIncomingMessage: ServerIncomingMessage
};
