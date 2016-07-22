var Server = require('./server.qtscript');
var Socket = require('./socket.qtscript');
var utils = require('./utils.qtscript');

var net = {

  /**
   * Emulate Node.js's `net.createServer([options][, connectionListener])` method.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_net_createserver_options_connectionlistener
   *
   * @param {Object} [options] - The server options.
   * @param {Function} [connectionListener] - Automatically set as a listener for
   *   the 'connection' event.
   * @return {Server} - The new Server object.
   */
  createServer: function createServer (options, connectionListener) {
    var server = new Server(options, connectionListener);

    return server;
  },

  /**
   * Overload of `net.createConnection()` to emulate Node.js's
   * `net.connect(options[, connectListener])`,
   * `net.connect(port[, host][, connectListener])`,
   * `net.connect(path[, connectListener])` methods.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_net_createconnection_options_connectlistener
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_net_createconnection_path_connectlistener
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_net_createconnection_port_host_connectlistener
   */
  connect: this.createConnection,

  /**
   * Emulate Node.js's `net.createConnection(options[, connectListener])`,
   * `net.createConnection(port[, host][, connectListener])`,
   * `net.createConnection(path[, connectListener])` methods.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_net_createconnection_options_connectlistener
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_net_createconnection_path_connectlistener
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_net_createconnection_port_host_connectlistener
   *
   * @param {Object | Number | String} port - The connection's options|port|path.
   * @param {String | Function} [host] - The connections's host|connectionListener.
   * @param {Function} [connectListener] - The connections's connectionListener.
   * @return {Socket} - The new Socket object.
   */
  createConnection: function createConnection (port, host, connectListener) {
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
      // TODO: Do we need to set `localAddress`, `localPort`, `family`, `lookup`?
    }

    var socket = new Socket(options);
    socket.connect(options, listener);
    return socket;
  },

  /**
   * Emulate Node.js's `net.isIP(input)` method.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_net_isip_input
   *
   * Tests if input is an IP address. Returns 0 for invalid strings, returns 4
   * for IP version 4 addresses, and returns 6 for IP version 6 addresses.
   *
   * @param {String} input - The address string to check.
   * @return {Number} - Returns 0 for invalid strings, returns 4 for IP version 4
   *   addresses, and returns 6 for IP version 6 addresses.
   */
  isIP: function isIP (input) {
    var networkLayerProtocol = utils._getIpProtocol(input);

    if (!networkLayerProtocol) {
      return 0;
    } else if (networkLayerProtocol === 'IPv4') {
      return 4;
    } else if (networkLayerProtocol === 'IPv6') {
      return 6;
    }
  },

  /**
   * Emulate Node.js's `net.isIPv4(input)` method.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_net_isipv4_input
   *
   * Tests if input is an IP address.
   *
   * @param {String} input - The address string to check.
   * @return {boolean} - Returns true if input is a version 4 IP address,
   *   otherwise returns false.
   */
  isIPv4: function isIPv4 (input) {
    return utils._getIpProtocol(input);
  },

  /**
   * Emulate Node.js's `net.isIPv6(input)` method.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_net_isipv6_input
   *
   * Tests if input is an IP address.
   *
   * @param {String} input - The address string to check.
   * @return {boolean} - Returns true if input is a version 6 IP address,
   *   otherwise returns false.
   */
  isIPv6: function isIPv6 (input) {
    return utils._getIpProtocol(input);
  },

  Server: Server,
  Socket: Socket,
  Stream: Socket // Older Node.js APIs use `Stream` instead of `Socket`.
};

module.exports = net;
