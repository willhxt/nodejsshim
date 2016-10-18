var EventEmitter = require('events').EventEmitter;
var http = require('http');
var util = require('util');
var url = require('url');

var WebSocket = require('./WebSocket.qtscript');

/**
 * Emulate Node.js's ws.Server class using Qt's QWebSocketServer class.
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#class-wsserver
 *
 * @param {Object} [options] - The WebSocket Server options.
 * @param {Function} [callback] - The connection callback.
 */
var WebSocketServer = function webSocketServerConstructor (options, callback) {
  if (!(this instanceof WebSocketServer)) {
    return new WebSocketServer(options, callback);
  }

  EventEmitter.call(this);

  var self = this;

  if (typeof options === 'function') {
    callback = options;
    options = {};
  } else {
    options = options || {};
  }

  this.options = {
    clientTracking: true,
    //disableHixie: false,
    //handleProtocols: null,
    host: '0.0.0.0',
    //maxPayload: null,
    name: 'xTuple WebSocket Server',
    //noServer: false,
    path: null,
    //perMessageDeflate: true,
    port: null,
    secureMode: false, // TODO: Default to secureMode = true once we figure out SSL.
    cert: null,
    key: null,
    server: null,
    verifyClient: null
  };

  this.options = Object.assign(this.options, options);
  this.options.allowedOrigins = Array.prototype.concat(["localhost"], (options.allowedOrigins ? options.allowedOrigins : []));

  var secureMode = options.secureMode ? QWebSocketServer.SecureMode : QWebSocketServer.NonSecureMode;

  this.QWebSocketServer = new QWebSocketServer(options.name, secureMode, mywindow);

  if (options.secureMode) {
    if (!options.cert || !options.key) {
      var startError = {
        message: "No SSL Certificate or PrivateKey supplied in the configuration options."
      };
      console.warn("WebSocket Server SecureMode Error: " + startError.message);
      this.emit('error', startError);
    }

    QSslSocket.addDefaultCaCertificate(QSslCertificate(options.cert));
    var sslConfiguration = QSslConfiguration();
    sslConfiguration.setPeerVerifyMode(QSslSocket.VerifyNone);
    sslConfiguration.setLocalCertificate(QSslCertificate(options.cert));
    sslConfiguration.setPrivateKey(QSslKey(options.key, QSsl.Rsa));
    sslConfiguration.setProtocol(QSsl.TlsV1SslV3);
    this.QWebSocketServer.setSslConfiguration(sslConfiguration);
  }

  this.maxConnections = options.maxConnections;
  this._connections = 0;
  if (this.maxConnections) {
    this.QWebSocketServer.setMaxPendingConnections(this.maxConnections);
  }

  this.path = options.path;
  this.clients = [];
  this.clientOrigin = null;

  /**
   * Handle new WebSocket client connection error.
   */
  function _isAcceptError (socketError) {
    var err = {
      message: "sOnAcceptError: " + socketError
    };
    self.emit('error', err);
  }

  /**
   * Handle new WebSocket client connection.
   */
  function _isNewConnection () {
    self._handleConnection();
  }
  /**
   * Handle new WebSocket client OriginAuthenticationRequired.
   *
   * We only allow the WebSocket Server's host, "127.0.0.1", and whatever is passed
   * in as options.allowedOrigins. This is to prevent Cross Site Scripting requests
   * reaching this WebSocket Server.
   */
  function _isOriginAuthenticationRequired (authenticator) {
    // TODO: There is a possible race condition from multiple clients
    // setting `self.clientOrigin` below. This code do not have that issue,
    // but it is not configurable from userland code. If this doesn't work out
    // fall back to using it. See `WebSocketServer.prototype._handleConnection`
    // which passed the `self.clientOrigin` to a `verifyClient` callback.
    /*
    var originUrl = new QUrl(authenticator.toString());
    var allowedOrigins = self.options.allowedOrigins.concat(self._host);

    // TODO: Should we allow scheme `file://` access?
    if ((originUrl.length) && allowedOrigins.indexOf(originUrl.host()) === -1 && (originUrl.scheme() !== "file")) {
      authenticator.setAllowed(false);
      console.warn("_isOriginAuthenticationRequired: WebSocket Client Origin " + authenticator.toString() + " is not allowed to access this server.");
    }
    */

    self.clientOrigin = authenticator.origin();
  }

  /**
   * Handle new WebSocket client PeerVerifyError.
   */
  function _isPeerVerifyError (error) {
    var err = {
      message: "sOnPeerVerifyError: " + error
    };
    self.emit('error', err);
  }

  /**
   * Handle new WebSocket client ServerError.
   */
  function _isServerError (closeCode) {
    var err = {
      message: "sOnServerError: " + closeCode
    };
    self.emit('error', err);
  }

  /**
   * Handle new WebSocket client SslErrors.
   */
  function _isSslErrors (errors) {
    var err = {
      message: "sOnSslErrors: " + errors
    };
    self.emit('error', err);
  }

  this.QWebSocketServer["acceptError(QAbstractSocket::SocketError)"].connect(_isAcceptError);
  this.QWebSocketServer["newConnection()"].connect(_isNewConnection);
  this.QWebSocketServer["originAuthenticationRequired(QWebSocketCorsAuthenticator *)"].connect(_isOriginAuthenticationRequired);
  this.QWebSocketServer["peerVerifyError(QSslError)"].connect(_isPeerVerifyError);
  this.QWebSocketServer["serverError(QWebSocketProtocol::CloseCode)"].connect(_isServerError);
  this.QWebSocketServer["sslErrors(QList<QSslError>)"].connect(_isSslErrors);

  if (typeof callback === 'function') {
    this.once('listening', callback);
  }

  if (options.port && options.port > 0) {
    this.listen(options.port, options.host, callback);
  }
};

util.inherits(WebSocketServer, EventEmitter);

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
 * Emulate Node.js's `ws.close([callback])` method.
 * @See: https://github.com/websockets/ws/blob/1.1.0/doc/ws.md#serverclosecallback
 *
 * @param {Function} [callback] - The callback to call when the server is closed.
 */
WebSocketServer.prototype.close = function close (callback) {
  var self = this;

  // Terminate all associated clients.
  var error = null;
  try {
    for (var i = 0, l = this.clients.length; i < l; ++i) {
      this.clients[i].terminate();
    }
  } catch (e) {
    error = e;
  }

  // Remove path descriptor, if any.
  if (this.path && this._webSocketPaths) {
    delete this._webSocketPaths[this.path];
    if (Object.keys(this._webSocketPaths).length == 0) {
      delete this._webSocketPaths;
    }
  }

  // Close the QWebSocketServer server.
  try {
    if (typeof this.QWebSocketServer !== 'undefined') {
      if (typeof this.QWebSocketServer.close === 'function') {
        this.QWebSocketServer.close();
      }

      if (typeof callback === 'function') {
        this.once('close', function() {
          callback(error);
        });
      } else if (error) {
        throw error;
      }
    }
  } finally {
    this.removeListener('listening', this._onceServerListening);
    this.removeListener('error', this._onServerError);
    this.removeListener('upgrade', this._onServerUpgrade);
    delete this.QWebSocketServer;

    process.nextTick(function () {
      self.emit('close');
    }, self);
  }

  return this;
};

/**
 * Private helper function for `server.listen()`.
 *
 * @param {Object} self - The `WebSocketServer` object.
 * @param {String} [address] - The address to listen on.
 * @param {Number} [port] - The port to listen on.
 * @param {Number} [addressType] - The IP address type, IPv4 === 4, IPv6 === 6.
 * @param {Number} [backlog] - The max pending connections to allow.
 *
 * @private
 */
function _listen(self, address, port, addressType, backlog) {
  if (backlog > 0) {
    self.QWebSocketServer.setMaxPendingConnections(backlog);
    self.maxConnections = backlog;
  }

  if (!self.QWebSocketServer.listen(QHostAddress(address), port)) {
    var message = "An unidentified error occurred when start to listen for the QWebSocketServer.";
    if (self.QWebSocketServer.error() !== QWebSocketProtocol.CloseCodeNormal) {
      var message = self.QWebSocketServer.errorString();
    }

    var err = {
      message: message + " WebSocket Server address:port: " + address + ":" + port
    };

    return self.emit('error', err);
  }

  var url = QUrl(self.QWebSocketServer.serverUrl());
  self._url = url.toString();
  self._host = url.host;

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
WebSocketServer.prototype.listen = function listen () {
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

    if (h instanceof WebSocketServer || h instanceof WebSocket) {
      //self._handle = h;
      //_listen(self, null, -1, -1, backlog);
      throw new Error('WebSocketServer.listen on an existing WebSocketServer or WebSocket argument is not supported.');
    } else if (typeof h.fd === 'number' && h.fd >= 0) {
      //_listen(self, null, null, null, backlog, h.fd);
      // TODO: This could be implimented with QFileDevice.
      throw new Error('WebSocketServer.listen on an file discripter argument is not supported.');
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

/**
 * Private helper function to handle the incomming client connections to this
 * WebSocket Server.
 *
 * @private
 */
WebSocketServer.prototype._handleConnection = function() {
  var self = this;
  var webSocket = this.QWebSocketServer.nextPendingConnection();

  // We can't call webSocket.error() because it conflicts with the error signal exposure in Qt Script.
  if (webSocket.errorString() !== 'Unknown error') { // 'Unknown error' is what is returned when there is no error.
    this.emit('error', new Error(webSocket.errorString() + ' accept'));
    return;
  }

  if (this.maxConnections && this._connections >= this.maxConnections) {
    webSocket.abort();
    return;
  }

  var socketOptions = {
    _server: this
  };
  var socket = new WebSocket([webSocket], socketOptions);
  socket.readable = socket.writable = true;

  // Handle premature socket errors.
  var errorHandler = function () {
    try {
      socket.destroy();
    } catch (e) {}
  };
  socket.on('error', errorHandler);

  this._connections++;
  socket.server = this;
  socket._server = this;

  // Check for wrong path.
  if (this.options.path) {
    var u = url.parse(socket.QWebSocket.urlrequestUrl().toString());
    if (u && u.pathname !== this.options.path) {
      this.clientOrigin = null;
      return;
    }
  }

  var req = socket.upgradeReq;

  // Optionally call external client verification handler.
  if (typeof this.options.verifyClient == 'function') {
    var info = {
      origin: this.clientOrigin,
      secure: this.options.secureMode,
      req: req
    };
    this.clientOrigin = null;

    if (this.options.verifyClient.length == 2) {
      this.options.verifyClient(info, function(result, code, name) {
        if (typeof code === 'undefined') code = 401;
        if (typeof name === 'undefined') name = http.STATUS_CODES[code];

        if (!result) {
          webSocket.close(QWebSocketProtocol.CloseCodePolicyViolated, name);
        } else {
          process.nextTick(function () {
            self.emit('connection', socket);
          }, this);
        }
      });
      return;
    } else if (!this.options.verifyClient(info)) {
      webSocket.close(QWebSocketProtocol.CloseCodePolicyViolated, 'Unauthorized');
      return;
    } else {
      process.nextTick(function () {
        self.emit('connection', socket);
      }, this);
    }
  } else {
    this.clientOrigin = null;
    process.nextTick(function () {
      self.emit('connection', socket);
    }, this);
  }

  if (this.options.clientTracking) {
    this.clients.push(socket);
    socket.on('close', function() {
      var index = self.clients.indexOf(socket);
      if (index != -1) {
        self.clients.splice(index, 1);
      }
    });
  }

  socket.removeListener('error', errorHandler);
};

module.exports = WebSocketServer;
