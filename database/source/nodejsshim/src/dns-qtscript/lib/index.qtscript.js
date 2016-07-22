// This is a stub for the `dns` module. It doesn't do anything right now, but
// can be used with `require('dns');` if something else needs `dns` to exist.

// @See: https://nodejs.org/dist/latest-v4.x/docs/api/dns.html
var dns = {
  // Methods
  getServers: undefined,

  /**
   * Emulate Node.js's `dns.lookup(hostname[, options], callback)` method.
   * @See: https://nodejs.org/dist/latest-v4.x/docs/api/dns.html#dns_dns_lookup_hostname_options_callback
   *
   * @param {String} hostname - The hosename to lookup the address for.
   * @param {Object | Function} [options] - The options to use for the DNS lookup.
   * @param {Function} callback - A callback function to call with the error and address[es].
   */
  lookup: function lookup (hostname, options, callback) {
    var next;
    var err = false;

    if (typeof options === 'function' && typeof callback === 'undefined') {
      next = options;
    } else {
      next = callback;
    }

    var family = options.family || 4;
    var dnsType = family === 4 ? QDnsLookup.A : QDnsLookup.AAAA;

    var dns = new QDnsLookup(mywindow);
    dns.setType(dnsType);
    dns.setName(hostname);

    function _isFinished() {
      var err = null;
      if (dns.error > 0) {
        err = {
          host: hostname,
          message: dns.errorString
        };
      }
      var addr = dns.hostAddressRecords();

      if (typeof addr[0] === 'object') {
        addr[0] = addr[0].toString();
      }

      next(err, addr[0], family);
    }

    dns["finished()"].connect(_isFinished);
    dns.lookup();
  },

  lookupService: undefined,
  resolve: undefined,
  resolve4: undefined,
  resolve6: undefined,
  resolveCname: undefined,
  resolveMx: undefined,
  resolveNs: undefined,
  resolveSoa: undefined,
  resolveSrv: undefined,
  resolveTxt: undefined,
  reverse: undefined,
  setServers: undefined
};

module.exports = dns;
