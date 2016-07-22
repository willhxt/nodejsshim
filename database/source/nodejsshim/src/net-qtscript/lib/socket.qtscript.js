var EventEmitter = require('events').EventEmitter;
var util = require('util');

var utils = require('./utils.qtscript');

/**
 * Emulate Node.js's net.Socket class using Qt's QTcpSocket class.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_class_net_socket
 *
 * @param {Object} [options] - The socket connection options.
 */
var Socket = function socketConstructor (options) {
  EventEmitter.call(this);
  this._options = {
    fd: null,
    allowHalfOpen: false,
    readable: false,
    writable: false
  };
  this._options = Object.assign(this._options, options);

  this._connecting = false;
  this._hadError = false;
  this._handle = null;
  this._parent = null;
  this._host = null;

  this.remoteAddress = null;
  this.remoteFamily = null;
  this.remotePort = null;
  this.localAddress = null;
  this._localFamily = null;
  this.localPort = null;
  this.bufferSize = null;
  this.bytesRead = null;
  this.bytesWritten = null;
  this._connecting = false;
  this.readable = false;
  this.writable = false;
  this._encoding = null;
  this._timer = false;
  this._timeout = 60 * 1000;
  this._idleTime = Date.now() + this._timeout;

/*
debugger;
  if (options.handle) {
    this._handle = options.handle; // private
  } else {
    // these will be set once there is a connection
    this.readable = this.writable = false;
  }

  // if we have a handle, then start the flow of data into the
  // buffer.  if not, then this will happen when we connect
  if (this._handle && options.readable !== false) {
// TODO: Below is for node's Stream. Convert to QTcpSocket.
debugger;
    if (options.pauseOnCreate) {
      // stop the handle from reading and pause the stream
      //this._handle.reading = false;
      //this._handle.readStop();
      //this._readableState.flowing = false;
    } else {
      //this.read(0);
    }
  }
*/

  if (options.QTcpSocket) {
    this.QTcpSocket = options.QTcpSocket;
  } else {
    this.QTcpSocket = new QTcpSocket(new QObject(mywindow));
  }
  // TODO: This just cuts it off at 1024. Figure out how to chunk the read.
  //this.QTcpSocket.setReadBufferSize(1024);
  var self = this;

  function _isConnected () {
    self._idleTime = Date.now() + self._timeout;
    self._connecting = false;
    self.readable = true;
    self.writable = true;
    self.localAddress = self.QTcpSocket.localAddress().toString();
    self.localPort = self.QTcpSocket.localPort();
    self.remoteAddress = self.QTcpSocket.peerAddress().toString();
    self.remotePort = self.QTcpSocket.peerPort();
    self.emit('connect');
  }
  function _isDisconnected () {
    self.emit('end');
    self.emit('close', false);
  }
  function _isError (socketError) {
    if (socketError === 5) {
      // TODO: `while (self.QTcpSocket.waitForReadyRead(200))` below throws signals error.
      // This probably happens if `waitForReadyRead()` calls `QTcpSocket.error()` to check for errors.
      // In Qt Script, there is a collision between the `error()` method and the signal.
      return;
    }
    self._idleTime = Date.now() + self._timeout;
    var err = {
      message: "enum QAbstractSocket::SocketError code: " + socketError
    };
    self.emit('error', err);
    self.emit('close', true);
  }
  function _isHostFound () {
    self._idleTime = Date.now() + self._timeout;
  }
  function _readData (loopedSize) {
    var size = self.QTcpSocket.bytesAvailable();
    if (size > 0) {
      self.isReading = true;
      self._idleTime = Date.now() + self._timeout;

      var qba = self.QTcpSocket.readAll();
      var data = utils._convertQByteArrayToEncoding(qba, self._encoding);
      self.emit('data', data);
      setTimeout(function () { _readData(size);}, 0);
    } else {
      self.isReading = false;
    }
  }
  function _isReadyRead () {
    if (!self.isReading) {
      _readData();
    }
  }
  function _isBytesWritten(bytes) {
    self._idleTime = Date.now() + self._timeout;
    self.bytesWritten = bytes;
    self.emit('drain');
  }

  this.QTcpSocket["connected()"].connect(_isConnected);
  this.QTcpSocket["disconnected()"].connect(_isDisconnected);
  this.QTcpSocket["error(QAbstractSocket::SocketError)"].connect(_isError);
  this.QTcpSocket["hostFound()"].connect(_isHostFound);
  this.QTcpSocket["readyRead()"].connect(_isReadyRead);
  this.QTcpSocket["bytesWritten(qint64)"].connect(_isBytesWritten);
};

util.inherits(Socket, EventEmitter);

Object.defineProperty(Socket.prototype, 'readyState', {
  get: function() {
    if (this._connecting) {
      return 'opening';
    } else if (this.readable && this.writable) {
      return 'open';
    } else if (this.readable && !this.writable) {
      return 'readOnly';
    } else if (!this.readable && this.writable) {
      return 'writeOnly';
    } else {
      return 'closed';
    }
  }
});

/**
 * Emulate Node.js's `socket.address()` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_address
 *
 * @return {{address: {String}, port: {Number}, family: {String}}}
 */
Socket.prototype.address = function address () {
  return {
    address: this.localAddress,
    family: this._localFamily,
    port: this.localPort
  };
};

/**
 * Emulate Node.js's `socket.connect(options[, connectListener])`,
 * `socket.connect(port[, host][, connectListener])`,
 * `socket.connect(path[, connectListener])` methods.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_connect_options_connectlistener
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_connect_path_connectlistener
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_connect_port_host_connectlistener
 *
 * @param {Object | Number | String} port - The connection's options|port|path.
 * @param {String | Function} [host] - The connections's host|connectionListener.
 * @param {Function} [connectListener] - The connections's connectionListener.
 */
Socket.prototype.connect = function connect (port, host, connectListener) {
  var self = this;
  var dns = require('dns');
  var options = (typeof port === 'object') ? port : false;
  var listener = (typeof host === 'function') ? host : connectListener;
  var path = (port !== parseInt(port, 10)) ? port : false;

  // If host is omitted, 'localhost' will be assumed when using port.
  host = (!host && !options && !path) ? 'localhost' : host;

  if (!options) {
    options = {};
    if (port && !path) {
      options.port = port;
    }
    if (host && !path) {
      options.host = host;
    }
    if (path) {
      options.path = path;
    }
  }

  /*
  var pipe = !!options.path;
  //debug('pipe', pipe, options.path);

  if (!this._handle) {
    this._handle = pipe ? new Pipe() : new TCP();
    initSocketHandle(this);
  }
  */

  var dnsopts = {
    family: options.family || 4,
    hints: 0
  };
  self._host = host;
  var lookup = options.lookup || dns.lookup;
  lookup(host, dnsopts, function(err, ip, addressType) {
    self.remoteAddress = ip;
    self.remoteFamily = addressType;
    self.remotePort = port;

    self.emit('lookup', err, ip, addressType);

    // It's possible we were destroyed while looking this up.
    // XXX it would be great if we could cancel the promise returned by
    // the look up.
    if (!self._connecting) return;

    if (err) {
      // net.createConnection() creates a net.Socket object and
      // immediately calls net.Socket.connect() on it (that's us).
      // There are no event listeners registered yet so defer the
      // error event to the next tick.
      err.host = options.host;
      err.port = options.port;
      err.message = err.message + ' ' + options.host + ':' + options.port;
      process.nextTick(function (self, err) {
        self.emit('error', err);
        self._destroy();
      }, self, err);
    } else {
      if (typeof listener === 'function') {
        this.on('connect', listener);
      }
      this._connecting = true;

      this.QTcpSocket.connectToHost(options.host, options.port);
    }
  });
};

/**
 * Emulate Node.js's `socket.destroy()` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_destroy
 */
Socket.prototype.destroy = function destroy () {
  this.QTcpSocket.abort();
};

/**
 * Emulate Node.js's `socket.end([data][, encoding])` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_end_data_encoding
 *
 * @param {String | Buffer} [data] - If set, passed to socket.write(data, encoding);
 * @param {String} [encoding] - If set, passed to socket.write(data, encoding);
 */
Socket.prototype.end = function end (data, encoding) {
  var self = this;
  if (data) {
    this.write(data, encoding);
    this.on('drain', function () {
      self.QTcpSocket.disconnectFromHost();
    });
  } else {
    this.QTcpSocket.disconnectFromHost();
  }
};

/**
 * Emulate Node.js's `socket.pause()` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_pause
 */
Socket.prototype.pause = function pause () {
  // We cannot support pausing the socket. Qt only allows for QAbstractSocket::PauseOnSslErrors.
  console.warn("socket.pause() is not supported by Qt's QAbstractSocket.")
};

// TODO: Support this?
/**
 * Emulate Node.js's `socket.ref()` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_ref
 *
 * @return {Socket}
 */
Socket.prototype.ref = function ref () {
  console.warn("Socket.prototype.ref() has not been implemented.");
  return this;
};

/**
 * Emulate Node.js's `socket.resume()` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_resume
 */
Socket.prototype.resume = function resume () {
  this.QTcpSocket.resume();
};

/**
 * Emulate Node.js's `socket.setEncoding([encoding])` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_setencoding_encoding
 *
 * @param {String} [encoding] - The encoding for the socket.
 */
Socket.prototype.setEncoding = function setEncoding (encoding) {
  if (encoding) {
    this._encoding = encoding;
  } else {
    // Reset.
    this._encoding = null;
  }
};

/**
 * Emulate Node.js's `socket.setKeepAlive([enable][, initialDelay])` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_setkeepalive_enable_initialdelay
 *
 * @param {Boolean} [enable] - Set to true to enable keepalive.
 * @param {Number} [initialDelay] - Not supported by Qt's QAbstractSocket.
 * @return {Socket}
 */
Socket.prototype.setKeepAlive = function setKeepAlive (enable, initialDelay) {
  if (typeof enable === 'undefined') {
    enable = false;
  }

  if (initialDelay) {
    console.warn("socket.setKeepAlive([enable][, initialDelay]). The `initialDelay` parameter is not supported by Qt's QAbstractSocket.")
  }

  this.QTcpSocket.setSocketOption(QAbstractSocket.KeepAliveOption, enable);

  return this;
};

/**
 * Emulate Node.js's `socket.setNoDelay([noDelay])` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_setnodelay_nodelay
 *
 * @param {Boolean} [noDelay] - Set to true to enable keepalive.
 * @return {Socket}
 */
Socket.prototype.setNoDelay = function setNoDelay (noDelay) {
  if (typeof noDelay === 'undefined') {
    noDelay = true;
  }

  this.QTcpSocket.setSocketOption(QAbstractSocket.LowDelayOption, noDelay);

  return this;
};

/**
 * Emulate Node.js's `socket.setTimeout(timeout[, callback])` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_settimeout_timeout_callback
 *
 * @param {Number} timeout - Sets the socket to timeout after timeout milliseconds
 *   of inactivity on the socket.
 * @param {Function} [callback] - The function to call when the idle timeout is reached.
 * @return {Socket}
 */
Socket.prototype.setTimeout = function setTimeout (timeout, callback) {
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

// TODO: Support this?
/**
 * Emulate Node.js's `socket.unref()` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_unref
 *
 * @return {Socket}
 */
Socket.prototype.unref = function unref () {
  console.warn("Socket.prototype.unref() has not been implemented.");
  return this;
};

/**
 * Emulate Node.js's `socket.write(data[, encoding][, callback])` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_socket_write_data_encoding_callback
 *
 * @param {String | Buffer} [data] - The data to write to the socket.
 * @param {String | Function} [encoding] - The encoding for the data.
 * @param {Function} [callback] - Callback will be executed when the data is
 *   finally written out - this may not be immediately.
 */
Socket.prototype.write = function write (data, encoding, callback) {
  var next;
  var writeEncoding;
  if (typeof encoding === 'function' && typeof callback === 'undefined') {
    next = encoding;
  } else {
    writeEncoding = encoding;
    next = callback;
  }

  if (typeof next === 'function') {
    this.on('drain', next);
  }

  var qba = utils._convertEncodingToQByteArray(data, writeEncoding);
  var written = this.QTcpSocket.write(qba);

  return 0 < written;
};

module.exports = Socket;
