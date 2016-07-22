var EventEmitter = require('events').EventEmitter;
var http = require('http');
var stream = require('stream');
var util = require('util');

var utils = require('./utils.qtscript');

/**
 * Emulate Node.js's ws.WebSocket class using Qt's QWebSocket class.
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#class-wswebsocket
 *
 * @param {String} address - The socket connection options.
 * @param {String | Array | Object} [protocols] - The WebSocket protocols. This parameter is not supported by QWebSocket.
 * @param {Object} [options] - The WebSocket options.
 */
var WebSocket = function webSocketConstructor (address, protocols, options) {
  if (this instanceof WebSocket === false) {
    return new WebSocket(address, protocols, options);
  }

  EventEmitter.call(this);

  if (protocols && !Array.isArray(protocols) && 'object' === typeof protocols) {
    // Accept the "options" Object as the 2nd argument.
    options = protocols;
    protocols = null;
  }

  options = options || {};

  // If this is an incoming client WebSocket on the WebSocketServer.
  if (Array.isArray(address)) {
    options.QWebSocket = address[0];

    if (options._server) {
      this._server = options._server;
      this._isServer = true;
      // @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketurl
      this.url = this._server.QWebSocketServer ? this._server.QWebSocketServer.serverUrl().toString() : 'unknown';
    }

    // @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketupgradereq
    // TODO: `QWebSocket.request()` wasn't added until Qt 5.6.
    //this.upgradeReq = new http.ClientIncomingMessage(function () {}, options.QWebSocket.request());

    // Mock up a `req` object for minimal authentication used by WebSocketServer
    // when passed a `verifyClient` callback option.
    this.upgradeReq = {
      headers: [],
      rawHeaders: [],
      url: options.QWebSocket.requestUrl().toString()
    };
  }

  this.options = {
    readable: false,
    writable: false,
  };

  this.options = Object.assign(this.options, options);

  if (options.QWebSocket) {
    this.QWebSocket = options.QWebSocket;
  } else {
    this.QWebSocket = new QWebSocket("", QWebSocketProtocol.VersionLatest, new QObject(mywindow));
  }

  this.QWebSocket["textMessageReceived(const QString &)"].connect(_isTextMessageReceived);

  this.QWebSocket["bytesWritten(qint64)"].connect(_isBytesWritten);
  this.QWebSocket["binaryFrameReceived(const QByteArray &, bool)"].connect(_isBinaryFrameReceived);
  this.QWebSocket["binaryMessageReceived(const QByteArray &)"].connect(_isBinaryMessageReceived);
  this.QWebSocket["connected()"].connect(_isConnected);
  this.QWebSocket["disconnected()"].connect(_isDisconnected);
  this.QWebSocket["error(QAbstractSocket::SocketError)"].connect(_isError);
  this.QWebSocket["pong(quint64, const QByteArray &)"].connect(_isPong);
  this.QWebSocket["textFrameReceived(const QString &, bool)"].connect(_isTextFrameReceived);

  this.bytesReceived = 0;
  this.protocolVersion = this.QWebSocket.version();
  this.supports = {
    binary: (this.protocolVersion > 0)
  };
  this._binaryType = 'nodebuffer';

  this.remoteAddress = null;
  this.remotePort = null;
  this.localAddress = null;
  this.localPort = null;
  this.bytesWritten = 0;
  this._closing = false;
  this._connecting = false;
  this.readable = false;
  this.writable = false;
  this._encoding = null;
  this._binaryFrames = [];
  this._textFrames = [];

  var self = this;

  function _isBytesWritten(bytes) {
    self.bytesWritten = self.bytesWritten + bytes;
    self.emit('drain');
  }
  function _isBinaryFrameReceived (frame, isLastFrame) {
    // TODO: It appears both `binaryMessageReceived` and `binaryFrameReceived` are called.
    /*
    self._binaryFrames.push(frame);

    if (isLastFrame) {
      var data = utils._convertQByteArrayToEncoding(self._binaryFrames.join(''), self._encoding);
      self.bytesReceived += data.length;
      self.emit('message', data);
      self._binaryFrames = [];
    }
    */
  }
  function _isBinaryMessageReceived (message) {
    var data = utils._convertQByteArrayToEncoding(message, self._encoding);
    self.bytesReceived += data.length;
    self.emit('message', data);
  }
  function _isConnected () {
    self._connecting = false;
    self.readable = true;
    self.writable = true;
    self.localAddress = self.QWebSocket.localAddress().toString();
    self.localPort = self.QWebSocket.localPort();
    self.remoteAddress = self.QWebSocket.peerAddress().toString();
    self.remotePort = self.QWebSocket.peerPort();
    self.emit('connect');
  }
  function _isDisconnected () {
    self._connecting = false;
    self.readable = false;
    self.writable = false;
    self._closing = false;
    self._closed = true;
    self.emit('end');
    self.emit('close', false);
  }
  function _isError (socketError) {
    if (socketError === 5) {
      return;
    }

    var err = {
      message: "enum QAbstractSocket::SocketError code: " + socketError
    };
    self._closing = false;
    self.emit('error', err);
    self.emit('close', true);
  }
  function _isPong(elapsedTime, payload) {
    var data = utils._convertQByteArrayToEncoding(payload, self._encoding);
    self.emit('pong', data, {binary: true});
  }
  function _isTextFrameReceived (frame, isLastFrame) {
    // TODO: It appears both `textMessageReceived` and `textFrameReceived` are called.
    /*
    self._textFrames.push(frame);

    if (isLastFrame) {
      var data = self._textFrames.join('');
      self.bytesReceived += data.length;
      self.emit('message', data);
      self._textFrames = [];
    }
    */
  }
  function _isTextMessageReceived (message) {
    self.emit('message', message);
    self.bytesReceived += message.length;
  }

  if (!Array.isArray(address)) {
    this.on('connect', function isConnected () {
      self.emit('open');
    });
    this.QWebSocket.open(QUrl(address));
  }
};

util.inherits(WebSocket, EventEmitter);

["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach(function each(state, index) {
    WebSocket.prototype[state] = WebSocket[state] = index;
});

/*
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketreadystate
 */
Object.defineProperty(WebSocket.prototype, 'readyState', {
  get: function() {
    if (this._connecting) {
      return WebSocket.CONNECTING;
    } else if (this.readable && this.writable) {
      return WebSocket.OPEN;
    } else if (this._closing) {
      return WebSocket.CLOSING;
    } else {
      return WebSocket.CLOSED;
    }
  }
});

/**
 * Emulate Node.js's `websocket.close([code], [data])` method.
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketclosecode-data
 *
 * @param {Number} [code] - The WebSocket close code to use.
 * @param {String | Buffer} [data] - If set, passed to `WebSocket.send(data, encoding);` before closing.
 */
WebSocket.prototype.close = function close (code, data) {
  var self = this;

  if (this.readyState === WebSocket.CLOSED) {
    return;
  }

  function sendAndClode () {
    self._closing = true;
    if (data) {
      self.send(data, function () {
        self.QWebSocket.close(code);
      });
    } else {
      self.QWebSocket.close(code);
    }
  }

  try {
    if (this.readyState === WebSocket.CONNECTING) {
      if (this.QWebSocket.isValid()) {
        sendAndClode();
      } else {
        this._connecting = false;
        this._closed = true;
      }
    } else if (this.readyState === WebSocket.CLOSING) {
      if (this._isServer) {
        this.terminate();
      }
    } else {this._closing = true;
      sendAndClode();
    }

    return;
  } catch (e) {
    this.emit('error', e);
  }
};

/**
 * Emulate Node.js's `websocket.pause()` method.
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketpause
 */
WebSocket.prototype.pause = function pause () {
  // We cannot support pausing the socket. Qt only allows for QAbstractSocket::PauseOnSslErrors.
  console.warn("websocket.pause() is not supported by Qt's QWebSocket.");
};

/**
 * Emulate Node.js's `websocket.ping([data], [options], [dontFailWhenClosed])` method.
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketpingdata-options-dontfailwhenclosed
 */
WebSocket.prototype.ping = function ping (data, options, dontFailWhenClosed) {
  if (this.readyState !== WebSocket.OPEN) {
    if (dontFailWhenClosed === true) {
      return;
    }
    throw new Error('not opened');
  }

  options = options || {};
  var payload = QByteArray();

  if (data) {
    if (options.binary) {
      payload = utils._convertEncodingToQByteArray(data, this._encoding);
    } else {
      payload = QByteArray(data);
    }
  }

  this.QWebSocket.ping(payload);
};

/**
 * Emulate Node.js's `websocket.pong([data], [options], [dontFailWhenClosed])` method.
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketpongdata-options-dontfailwhenclosed
 */
WebSocket.prototype.pong = function pong (data, options, dontFailWhenClosed) {
  if (this.readyState !== WebSocket.OPEN) {
    if (dontFailWhenClosed === true) {
      return;
    }
    throw new Error('not opened');
  }

  // TODO: Can we support pong? It's a signal.
  console.warn("websocket.pong() is not supported Qt's QWebSocket.");
};

/**
 * Emulate Node.js's `websocket.resume()` method.
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketresume
 */
WebSocket.prototype.resume = function resume () {
  if (this.readyState !== WebSocket.OPEN) {
    throw new Error('not opened');
  }

  this.QWebSocket.resume();
};

/**
 * Emulate Node.js's `websocket.send(data, [options], [callback])` method.
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketsenddata-options-callback
 *
 * @param {String | Buffer} [data] - The data to write to the socket.
 * @param {String | Function} [encoding] - The encoding for the data.
 * @param {Function} [callback] - Callback will be executed when the data is
 *   finally written out - this may not be immediately.
 */
WebSocket.prototype.send = function send (data, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (this.readyState !== WebSocket.OPEN) {
    if (typeof callback === 'function') {
      callback(new Error('not opened'));
    } else {
      throw new Error('not opened');
    }
    return;
  }

  if (!data) {
    data = '';
  }

  if (this._queue) {
    var self = this;
    this._queue.push(function() {
      self.send(data, options, cb);
    });
    return;
  }

  var written = -1;
  options = options || {};
  options.fin = true;

  if (typeof options.binary === 'undefined') {
    // TODO: Will need to add other types if the JS Engine ever supports them. `ArrayBuffer` etc.
    options.binary = data instanceof Buffer;
  }

  var readable = typeof stream.Readable === 'function'
    ? stream.Readable
    : stream.Stream;

  if (data instanceof readable) {
    startQueue(this);
    var self = this;

    sendStream(this, data, options, function send(error) {
      process.nextTick(function tock() {
        executeQueueSends(self);
      });

      if (typeof callback === 'function') {
        callback(error);
      }
    });

    return true;
  } else {
    if (typeof callback === 'function') {
      this.once('drain', callback);
    }
    written = this._sendData(data);

    return 0 < written;
  }
};

/**
 * Emulate Node.js's `websocket.stream([options], callback)` method.
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketstreamoptions-callback
 */
WebSocket.prototype.stream = function stream (options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var self = this;

  if (typeof callback !== 'function') {
    throw new Error('callback must be provided');
  }

  if (this.readyState !== WebSocket.OPEN) {
    if (typeof callback === 'function') {
      callback(new Error('not opened'));
    } else {
      throw new Error('not opened');
    }
    return;
  }

  if (this._queue) {
    this._queue.push(function () {
      self.stream(options, callback);
    });
    return;
  }

  options = options || {};

  startQueue(this);

  function send(data, final) {
    try {
      if (self.readyState !== WebSocket.OPEN) {
        throw new Error('not opened');
      }
      options.fin = final === true;

      self._sendData(data);
      if (!final) {
        process.nextTick(callback.bind(null, null, send));
      } else {
        executeQueueSends(self);
      }
    } catch (e) {
      if (typeof callback === 'function') {
        callback(e);
      } else {
        delete self._queue;
        self.emit('error', e);
      }
    }
  }

  process.nextTick(callback.bind(null, null, send));
};

/**
 * Emulate Node.js's `websocket.terminate()` method.
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketterminate
 */
WebSocket.prototype.terminate = function terminate () {
  this._closing = true;
  this.QWebSocket.abort();
};

/**
 * Private helper function that sends the data on the QWebSocket.
 *
 * @private
 */
WebSocket.prototype._sendData = function _sendData (data) {
  var written = 0;

  if (typeof data === 'string') {
    written = this.QWebSocket.sendTextMessage(data);
  } else if (data instanceof Buffer === true) {
    var qba = utils._convertEncodingToQByteArray(data, this._encoding);
    written = this.QWebSocket.sendBinaryMessage(qba);
  }

  return written;
};

/**
 * Expose binaryType
 *
 * This deviates from the W3C interface since ws doesn't support the required
 * default "blob" type (instead we define a custom "nodebuffer" type).
 *
 * @See: http://dev.w3.org/html5/websockets/#the-websocket-interface
 * @api public
 */
Object.defineProperty(WebSocket.prototype, 'binaryType', {
  get: function get() {
    return this._binaryType;
  },
  set: function set(type) {
    if (type === 'arraybuffer' || type === 'nodebuffer') {
      this._binaryType = type;
    } else {
      throw new SyntaxError('unsupported binaryType: must be either "nodebuffer" or "arraybuffer"');
    }
  }
});

/**
 * Emulates the W3C Browser based WebSocket interface using function members.
 *
 * @See: http://dev.w3.org/html5/websockets/#the-websocket-interface
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketonopen
 * @api public
 */
['open', 'error', 'close', 'message'].forEach(function(method) {
  Object.defineProperty(WebSocket.prototype, 'on' + method, {
    /**
     * Returns the current listener
     *
     * @returns {Mixed} the set function or undefined
     * @api public
     */
    get: function get() {
      var listener = this.listeners(method)[0];
      return listener ? (listener._listener ? listener._listener : listener) : undefined;
    },

    /**
     * Start listening for events
     *
     * @param {Function} listener the listener
     * @returns {Mixed} the set function or undefined
     * @api public
     */
    set: function set(listener) {
      this.removeAllListeners(method);
      this.addEventListener(method, listener);
    }
  });
});

/**
 * Emulates the W3C Browser based WebSocket interface using addEventListener.
 *
 * @See: https://developer.mozilla.org/en/DOM/element.addEventListener
 * @See: http://dev.w3.org/html5/websockets/#the-websocket-interface
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#websocketaddeventlistenermethod-listener
 * @api public
 */
WebSocket.prototype.addEventListener = function(method, listener) {
  var target = this;

  function onMessage (data, flags) {
    // TODO: Support other buffer types when the JS Engine does.
    //if (flags.binary && this.binaryType === 'arraybuffer') {
    //  data = new Uint8Array(data).buffer;
    //}
    listener.call(target, new MessageEvent(data, !!flags.binary, target));
  }

  function onClose (code, message) {
    listener.call(target, new CloseEvent(code, message, target));
  }

  function onError (event) {
    event.type = 'error';
    event.target = target;
    listener.call(target, event);
  }

  function onOpen () {
    listener.call(target, new OpenEvent(target));
  }

  if (typeof listener === 'function') {
    if (method === 'message') {
      // store a reference so we can return the original function from the
      // addEventListener hook
      onMessage._listener = listener;
      this.on(method, onMessage);
    } else if (method === 'close') {
      // store a reference so we can return the original function from the
      // addEventListener hook
      onClose._listener = listener;
      this.on(method, onClose);
    } else if (method === 'error') {
      // store a reference so we can return the original function from the
      // addEventListener hook
      onError._listener = listener;
      this.on(method, onError);
    } else if (method === 'open') {
      // store a reference so we can return the original function from the
      // addEventListener hook
      onOpen._listener = listener;
      this.on(method, onOpen);
    } else {
      this.on(method, listener);
    }
  }
};

/**
 * W3C MessageEvent
 *
 * @See: http://www.w3.org/TR/html5/comms.html
 * @constructor
 * @api private
 */
function MessageEvent(dataArg, isBinary, target) {
  this.type = 'message';
  this.data = dataArg;
  this.target = target;
  this.binary = isBinary; // non-standard.
}

/**
 * W3C CloseEvent
 *
 * @See: http://www.w3.org/TR/html5/comms.html
 * @constructor
 * @api private
 */
function CloseEvent(code, reason, target) {
  this.type = 'close';
  this.wasClean = (typeof code === 'undefined' || code === 1000);
  this.code = code;
  this.reason = reason;
  this.target = target;
}

/**
 * W3C OpenEvent
 *
 * @See: http://www.w3.org/TR/html5/comms.html
 * @constructor
 * @api private
 */
function OpenEvent(target) {
  this.type = 'open';
  this.target = target;
}

function startQueue(instance) {
  instance._queue = instance._queue || [];
}

function executeQueueSends(instance) {
  var queue = instance._queue;
  if (typeof queue === 'undefined') {
    return;
  }

  delete instance._queue;
  for (var i = 0, l = queue.length; i < l; ++i) {
    queue[i]();
  }
}

function sendStream(instance, stream, options, cb) {
  stream.on('data', function incoming(data) {
    if (instance.readyState !== WebSocket.OPEN) {
      if (typeof cb === 'function') {
        cb(new Error('not opened'));
      } else {
        delete instance._queue;
        instance.emit('error', new Error('not opened'));
      }
      return;
    }

    options.fin = false;
    instance._sendData(data);
  });

  stream.on('end', function end() {
    if (instance.readyState !== WebSocket.OPEN) {
      if (typeof cb === 'function') cb(new Error('not opened'));
      else {
        delete instance._queue;
        instance.emit('error', new Error('not opened'));
      }
      return;
    }

    options.fin = true;
    instance._sendData(null);

    if (typeof cb === 'function') {
      cb(null);
    }
  });
}

module.exports = WebSocket;
