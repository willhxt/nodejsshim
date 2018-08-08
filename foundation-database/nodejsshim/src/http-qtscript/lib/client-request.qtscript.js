var EventEmitter = require('events').EventEmitter;
var util = require('util');
var IncomingMessage = require('./incoming-message.qtscript').ClientIncomingMessage;

/**
 * Emulate Node.js's `http.ClientRequest` class using Qt's QNetworkRequest class.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_class_http_clientrequest
 *
 * @param {Object} [options] - The socket connection options.
 */
function ClientRequest(options, cb) {
  var self = this;

  this.port = options.port || 80;
  this.scheme = (this.port === 80) ? "http://" : "https://";
  this.headers = {};
  this.hostname = options.hostname || options.host;
  this.path = options.path || "/";
  this.uri = this.scheme + this.hostname + this.path;

  this._timer = false;
  this._timeout = 60 * 1000;
  this._idleTime = Date.now() + this._timeout;

  if (mainwindow.qtVersion() === '5.5.1' && mainwindow.getWindowSystem() === mainwindow.MAC) {
    this.QNetworkManager = new QNetworkAccessManager(mywindow);
  } else {
    if (!global.globalQNetworkAccessManager) {
      // Qt docs recommend:
      //  - "One QNetworkAccessManager instance should be enough for the whole Qt application."
      //
      // We set a global `QNetworkAccessManager` that will be reused by this
      // instance of the `QtScriptEngine` for all network requests. This has better
      // performance than creating and destroying a `QNetworkAccessManager` for
      // each request. It also avoids hitting an error after 300 to 500 requests:
      //  - `QThread::start: Failed to create thread (The access code is invalid.)`
      global.globalQNetworkAccessManager = new QNetworkAccessManager(mywindow);
    }

    this.QNetworkManager = globalQNetworkAccessManager;
  }

  this.QNetworkRequest = new QNetworkRequest();

  // TODO: Implement other methods.
  function otherMethod () {
    throw new Error("HTTP Method not supported yet.");
  }
  function wrapDelete () {
    return self.QNetworkManager.deleteResource(self.QNetworkRequest);
  }
  function wrapGet (data) {
    if (data) {
      return self.QNetworkManager.sendCustomRequest(self.QNetworkRequest, QByteArray('GET'), new QBuffer(new QByteArray(data)));
    } else {
      return self.QNetworkManager.get(self.QNetworkRequest);
    }
  }
  function wrapHead () {
    return self.QNetworkManager.head(self.QNetworkRequest);
  }
  function wrapOptions (data) {
    return self.QNetworkManager.sendCustomRequest(self.QNetworkRequest, QByteArray('OPTIONS'), new QBuffer(new QByteArray(data)));
  }
  function wrapPatch (data) {
    return self.QNetworkManager.sendCustomRequest(self.QNetworkRequest, QByteArray('PATCH'), new QBuffer(new QByteArray(data)));
  }
  function wrapPost (data) {
    return self.QNetworkManager.post(self.QNetworkRequest, QByteArray(data));
  }
  function wrapPut (data) {
    return self.QNetworkManager.put(self.QNetworkRequest, QByteArray(data));
  }
  this.method = options.method || "GET";
  this.methodMap = {
    "DELETE": wrapDelete,
    "GET": wrapGet,
    "HEAD": wrapHead,
    "OPTIONS": wrapOptions,
    "PATCH": wrapPatch,
    "POST": wrapPost,
    "PUT": wrapPut
  };

  this.QNetworkRequest.setUrl(QUrl(this.uri));

  if (options.headers) {
    for (var header in options.headers) {
      if (options.headers[header]) {
        self.QNetworkRequest.setRawHeader(QByteArray(header), QByteArray(options.headers[header]));
        self.headers[header] = options.headers[header];
      }
    }
  }

  if (options.ciphers) {
    // TODO: Support ciphers
    // @See: https://doc.qt.io/qt-5/qnetworkrequest.html#setSslConfiguration
  }

  if (cb) {
    this.callback = cb;
  }

  this.response = new IncomingMessage(this.methodMap[this.method], this.QNetworkRequest);

  this.response.once('response', function (res) {
    self.emit('response', res);
  });

  // QNetworkAccessManager doesn't open a socket and wait. So we have to
  // emit 'socket' from `ClientIncomingMessage` first and then 'connect'
  // or 'secureConnect'.
  this.response.once('socket', function (res) {
    self.emit('socket', res);
    res.emit((res.port === 80) ? 'connect' : 'secureConnect', res, res, res.headers);
  });

  this.response.once('close', function () {
    if (self._timer) {
      self.setTimeout(0);
    }
    self.removeAllListeners('timeout');

    if (!global.globalQNetworkAccessManager) {
      self.QNetworkManager.deleteLater();
    }
  });

  return this;
}

util.inherits(ClientRequest, EventEmitter);

/**
 * Emulate Node.js's ClientRequest `request.abort()` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_request_abort
 */
ClientRequest.prototype.abort = function abort () {
  this.response.QNetworkReply.abort();
  this.emit('abort');
};

/**
 * Emulate Node.js's ClientRequest `request.end([data][, encoding][, callback])` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_request_end_data_encoding_callback
 */
ClientRequest.prototype.end = function end (data, encoding, callback) {
  var self = this;

  if (data) {
    this.response.data = data;
  }

  this.response.executeRequest();

  if (this.callback) {
    this.callback(this.response);
  }
};

/**
 * Emulate Node.js's ClientRequest `request.flushHeaders()` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_request_flushheaders
 */
ClientRequest.prototype.flushHeaders = function flushHeaders () {
  // TODO: QNetworkRequest doesn't have any way to support this. It's not required.
};

/**
 * Emulate Node.js's ClientRequest `request.setNoDelay([noDelay])` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_request_setnodelay_nodelay
 */
ClientRequest.prototype.setNoDelay = function setNoDelay (noDelay) {
  // TODO: QNetworkRequest doesn't have any way to support this. It's not required.
};

/**
 * Emulate Node.js's ClientRequest `request.setSocketKeepAlive([enable][, initialDelay])` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_request_setsocketkeepalive_enable_initialdelay
 */
ClientRequest.prototype.setSocketKeepAlive = function setSocketKeepAlive (noDelay) {
  // TODO: QNetworkRequest doesn't have any way to support this. It's not required.
};

/**
 * Emulate Node.js's ClientRequest `request.setTimeout(timeout[, callback])` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_request_settimeout_timeout_callback
 *
 * @param {Number} timeout - Sets the socket to timeout after timeout milliseconds
 *   of inactivity on the socket.
 * @param {Function} [callback] - The function to call when the idle timeout is reached.
 * @return {ClientRequest}
 */
ClientRequest.prototype.setTimeout = function setTimeout (timeout, callback) {
  var self = this;

  if (self._timer && timeout === 0) {
    clearInterval(self._timer);
  } else {
    if (callback) {
      self.once('timeout', callback);
    }
    self._timeout = timeout;
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

/**
 * Emulate Node.js's ClientRequest `request.write(chunk[, encoding][, callback])` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_request_write_chunk_encoding_callback
 */
ClientRequest.prototype.write = function write (chunk, encoding, callback) {
  var self = this;

  this.response.data = chunk;

  if (this.callback) {
    this.callback(this.response);
  }
};

module.exports = ClientRequest;
