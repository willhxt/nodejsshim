var common = require('./common');
var ClientRequest = require('./client-request.qtscript');
var ClientIncomingMessage = require('./incoming-message.qtscript').ClientIncomingMessage;
var IncomingMessage = require('./incoming-message.qtscript').ServerIncomingMessage;
var Server = require('./server.qtscript');
var ServerResponse = require('./server-response.qtscript');
var utils = require('./utils.qtscript');

var http = {
  Agent: null,
  ClientRequest: ClientRequest,
  Server: Server,
  ServerResponse: ServerResponse,
  IncomingMessage: IncomingMessage,
  ClientIncomingMessage: ClientIncomingMessage,
  METHODS: common.methods.slice().sort(),
  STATUS_CODES: utils.STATUS_CODES,
  createClient: null,
  createServer: function(requestListener) {
    return new Server(requestListener);
  },
  get: function(options, cb) {
    options.method = 'GET';
    var req = this.request(options, cb);
    req.end();
    return req;
  },
  globalAgent: null,
  request: function(options, cb) {
    return new ClientRequest(options, cb);
  }
};

module.exports = http;
