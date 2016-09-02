var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Socket = require('./socket.qtscript');

/**
 * Emulate Node.js's net.Server class using Qt's QTcpServer class.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_class_net_server
 *
 * @param {Object} [options] - The socket connection options.
 * @param {Function} [connectionListener] - The connection callback.
 */
var Server = function serverConstructor (options, connectionListener) {
  if (!(this instanceof Server)) {
    return new Server(options, connectionListener);
  }

  EventEmitter.call(this);

  var self = this;

  if (typeof options === 'function') {
    connectionListener = options;
    options = {};
    self.on('connection', connectionListener);
  } else {
    options = options || {};

    if (typeof connectionListener === 'function') {
      self.on('connection', connectionListener);
    }
  }

  this._connections = 0

  this._handle = null;
  this._usingSlaves = false;
  this._slaves = [];
  this._unref = false;

  this.allowHalfOpen = options.allowHalfOpen || false;
  this.pauseOnConnect = !!options.pauseOnConnect;

  this.QTcpServer = new QTcpServer(mywindow);

  function _onConnection () {
    var connectionBeforeData = false;

    function emitConnection (data) {
      self.emit('connection', socket);

      if (data) {
        process.nextTick(function () {
          socket.emit('data', data);
        }, self);
      }
    }

    var tcpSocket = self.QTcpServer.nextPendingConnection();

    // We can't call tcpSocket.error() because it conflicts with the error signal exposure in Qt Script.
    if (tcpSocket.errorString() !== 'Unknown error') { // 'Unknown error' is what is returned when there is no error.
      self.emit('error', new Error(tcpSocket.errorString() + ' accept'));
      return;
    }

    if (self.maxConnections && self._connections >= self.maxConnections) {
      tcpSocket.abort();
      return;
    }

    var socket = new Socket({
      QTcpSocket: tcpSocket,
      allowHalfOpen: self.allowHalfOpen,
      pauseOnCreate: self.pauseOnConnect
    });
    socket.readable = socket.writable = true;

    // Sometimes the socket will emit 'data' before we emit `connection` below.
    // Add our own socket.on('data') handler that will emit `connection` first.
    socket.on('data', function (data) {
      if (!connectionBeforeData) {
        connectionBeforeData = true;
        emitConnection(data);
      }
    });

    self._connections++;
    socket.server = self;
    socket._server = self;

    process.nextTick(function () {
      if (!connectionBeforeData) {
        connectionBeforeData = true;
        emitConnection();
      }
    }, self);
  }

  this.QTcpServer["newConnection()"].connect(_onConnection);
};

util.inherits(Server, EventEmitter);

function isLegalPort(port) {
  return (port >= 0 && port < 65536);
}

function isPipeName(s) {
  return typeof s === 'string' && toNumber(s) === false;
}

function toNumber(x) {
  return (x = Number(x)) >= 0 ? x : false;
}

/**
 * @typedef ServerAddress
 * @type Object
 * @property port {Number} - The port the server is listening on.
 * @property family {String} - The IP address version.
 * @property address {String} - The IP address the server is listening on.
 */

/**
 * Emulate Node.js's `server.address()` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_server_address
 *
 * @return {ServerAddress}
 */
Server.prototype.address = function address () {
  return {
    address: this.QTcpServer.serverAddress().toString(),
    family: this.QTcpServer.serverAddress().protocol() === 1 ? 'IPv6' : 'IPv4',
    port: this.QTcpServer.serverPort()
  };
};

/**
 * Emulate Node.js's `server.close([callback])` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_server_close_callback
 *
 * @param {Function} [callback] - The callback to call when the server is closed.
 */
Server.prototype.close = function close (callback) {
  var self = this;
  this.QTcpServer.close();

  if (typeof callback === 'function') {
    if (!this.QTcpServer.isListening()) {
      this.once('close', function() {
        callback(new Error('Not running'));
      });
    } else {
      this.once('close', callback);
    }
  }

  process.nextTick(function () {
    self.emit('close');
  }, self);

  return this;
};

/**
 * Emulate Node.js's `server.getConnections(callback)` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_server_getconnections_callback
 *
 * @param {Function} [callback] - The callback to call with the number of connections.
 */
Server.prototype.getConnections = function getConnections (callback) {
  callback(null, this.QTcpServer._connections);
};

/**
 * Private helper function for `server.listen()`.
 *
 * @param {Object} self - The `Server` object.
 * @param {String} [address] - The address to listen on.
 * @param {Number} [port] - The port to listen on.
 * @param {Number} [addressType] - The IP address type, IPv4 === 4, IPv6 === 6.
 * @param {Number} [backlog] - The max pending connections to allow.
 */
function _listen(self, address, port, addressType, backlog) {
  if (backlog > 0) {
    self.QTcpServer.setMaxPendingConnections(backlog);
    self.maxConnections = backlog;
  }

  var hostAddress = new QHostAddress(address);

  if (!self.QTcpServer.listen(hostAddress, port)) {
    var message = "An unidentified error occurred when start to listen for the QTcpServer.";
    if (self.QTcpServer.serverError() > -1) {
      var message = self.QTcpServer.errorString();
    }

    var err = {
      message: message + " Server address:port: " + address + ":" + port
    };

    return self.emit('error', err);
  }

  // generate connection key, this should be unique to the connection
  self._connectionKey = addressType + ':' + address + ':' + port;

  process.nextTick(function () {
    self.emit('listening');
  }, self);
}

/**
 * Emulate Node.js's
 * `server.listen(handle[, backlog][, callback])`,
 * `server.listen(options[, callback])`,
 * `server.listen(path[, backlog][, callback])`,
 * `server.listen(port[, hostname][, backlog][, callback])` methods.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_server_listen_handle_backlog_callback
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_server_listen_options_callback
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_server_listen_path_backlog_callback
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_server_listen_port_hostname_backlog_callback
 *
 * @param {Object | Number} - The config optoins | port to listen on.
 * @param {String | Function | Number} - The hostname to listen on | listen callback | max pending connections to allow.
 * @param {Function | Number} - The listen callback | max pending connections to allow.
 * @param {Function} - The listen callback.
 */
Server.prototype.listen = function listen () {
  var self = this;

  var lastArg = arguments[arguments.length - 1];
  if (typeof lastArg === 'function') {
    self.once('listening', lastArg);
  }

  var port = toNumber(arguments[0]);

  // The third optional argument is the backlog size.
  // When the ip is omitted it can be the second argument.
  var backlog = toNumber(arguments[1]) || toNumber(arguments[2]);

  if (arguments.length === 0 || typeof arguments[0] === 'function') {
    // Bind to a random port.
    _listen(self, null, 0, null, backlog);
  } else if (arguments[0] !== null && typeof arguments[0] === 'object') {
    var h = arguments[0];
    h = h._handle || h.handle || h;

    if (h instanceof Server || h instanceof Socket) {
      //self._handle = h;
      //_listen(self, null, -1, -1, backlog);
      throw new Error('Server.listen on an existing Server or Socket argument is not supported.');
    } else if (typeof h.fd === 'number' && h.fd >= 0) {
      //_listen(self, null, null, null, backlog, h.fd);
      // TODO: This could be implimented with QFileDevice.
      throw new Error('Server.listen on an file discripter argument is not supported.');
    } else {
      // The first argument is a configuration object
      if (h.backlog)
        backlog = h.backlog;

      if (typeof h.port === 'number' || typeof h.port === 'string' ||
          (typeof h.port === 'undefined' && 'port' in h)) {
        // Undefined is interpreted as zero (random port) for consistency
        // with net.connect().
        if (typeof h.port !== 'undefined' && !isLegalPort(h.port))
          throw new RangeError('port should be >= 0 and < 65536: ' + h.port);
        if (h.host)
          listenAfterLookup(h.port | 0, h.host, backlog, h.exclusive);
        else
          _listen(self, null, h.port | 0, 4, backlog, undefined, h.exclusive);
      } else if (h.path && isPipeName(h.path)) {
        //var pipeName = self._pipeName = h.path;
        //_listen(self, pipeName, -1, -1, backlog, undefined, h.exclusive);
        // TODO: This could be implimented with QFileDevice or QLocalSocket.
        throw new Error('Local path socket server is not supported.');
      } else {
        throw new Error('Invalid listen argument: ' + h);
      }
    }
  } else if (isPipeName(arguments[0])) {
    // UNIX socket or Windows pipe.
    //var pipeName = self._pipeName = arguments[0];
    //_listen(self, pipeName, -1, -1, backlog);
    // TODO: This could be implimented with QFileDevice or QLocalSocket.
    throw new Error('Local path socket server is not supported.');
  } else if (arguments[1] === undefined ||
             typeof arguments[1] === 'function' ||
             typeof arguments[1] === 'number') {
    // The first argument is the port, no IP given.
    _listen(self, null, port, 4, backlog);

  } else {
    // The first argument is the port, the second an IP.
    listenAfterLookup(port, arguments[1], backlog);
  }

  function listenAfterLookup(port, address, backlog, exclusive) {
    if (address === 'localhost') {
      _listen(self, '127.0.0.1', port, 4, backlog, undefined, exclusive);
    } else if (address === '::1') {
      _listen(self, address, port, 6, backlog, undefined, exclusive);
    } else if (address === '127.0.0.1') {
      _listen(self, address, port, 4, backlog, undefined, exclusive);
    } else {
      require('dns').lookup(address, function(err, ip, addressType) {
        if (err) {
          self.emit('error', err);
        } else {
          addressType = ip ? addressType : 4;
          _listen(self, ip, port, addressType, backlog, undefined, exclusive);
        }
      });
    }
  }

  return self;
};

// TODO: Support this?
/**
 * Emulate Node.js's `server.ref()` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_server_ref
 *
 * @return {Server}
 */
Server.prototype.ref = function unref () {
  console.warn("Server.prototype.ref() has not been implemented.");
  return this;
};

// TODO: Support this?
/**
 * Emulate Node.js's `server.unref()` method.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_server_unref
 *
 * @return {Server}
 */
Server.prototype.unref = function unref () {
  console.warn("Server.prototype.unref() has not been implemented.");
  return this;
};

module.exports = Server;
