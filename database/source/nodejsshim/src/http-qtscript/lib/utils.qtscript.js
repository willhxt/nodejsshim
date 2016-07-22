var utils = {
  /**
   * Helper function to convert a Qt QByteArray to the encoding format.
   *
   * @param {QByteArray} qba - The QByteArray to convert.
   * @param {String} [encoding] - The encoding can be 'hex', 'binary' or 'base64'.
   *   If no encoding is provided, then a buffer is returned.
   * @return {String | Buffer} - The encoded QByteArray data.
   * @private
   */
  _convertQByteArrayToEncoding: function _convertQByteArrayToEncoding (qba, encoding) {
    var data;
    switch (encoding) {
      case 'base64':
        data = qba.toBase64();
        break;
      case 'binary':
        data = qba.toString();
        break;
      case 'hex':
        data = qba.toHex();
        break;
      case 'utf8':
      case 'utf-8':
      default:
        // Utf8 encode the QByteArray.
        //var encodedQba = new QByteArray(qba.toString());
        var encodedQba = new QByteArray(qba.toLatin1());

        // Node.js's default is a Buffer.
        if (Buffer.fromQByteArray) {
          data = Buffer.fromQByteArray(encodedQba);
        } else {
          var buffer = new Buffer(encodedQba.size());
          var mask = (1 << 8) -1;
          // HEX conversion is slower.
          //var hex = encodedQba.toHex().toString();
          //buffer.write(hex, "hex");
          var size = encodedQba.size();
          for (var i = 0; i < size; i++) {
            buffer[i] = encodedQba.at(i) & mask;
          }
          data = buffer;
        }
    }

    return data;
  },

  STATUS_CODES: {
    100 : 'Continue',
    101 : 'Switching Protocols',
    102 : 'Processing',                 // RFC 2518, obsoleted by RFC 4918
    200 : 'OK',
    201 : 'Created',
    202 : 'Accepted',
    203 : 'Non-Authoritative Information',
    204 : 'No Content',
    205 : 'Reset Content',
    206 : 'Partial Content',
    207 : 'Multi-Status',               // RFC 4918
    208 : 'Already Reported',
    226 : 'IM Used',
    300 : 'Multiple Choices',
    301 : 'Moved Permanently',
    302 : 'Found',
    303 : 'See Other',
    304 : 'Not Modified',
    305 : 'Use Proxy',
    307 : 'Temporary Redirect',
    308 : 'Permanent Redirect',         // RFC 7238
    400 : 'Bad Request',
    401 : 'Unauthorized',
    402 : 'Payment Required',
    403 : 'Forbidden',
    404 : 'Not Found',
    405 : 'Method Not Allowed',
    406 : 'Not Acceptable',
    407 : 'Proxy Authentication Required',
    408 : 'Request Timeout',
    409 : 'Conflict',
    410 : 'Gone',
    411 : 'Length Required',
    412 : 'Precondition Failed',
    413 : 'Payload Too Large',
    414 : 'URI Too Long',
    415 : 'Unsupported Media Type',
    416 : 'Range Not Satisfiable',
    417 : 'Expectation Failed',
    418 : 'I\'m a teapot',              // RFC 2324
    421 : 'Misdirected Request',
    422 : 'Unprocessable Entity',       // RFC 4918
    423 : 'Locked',                     // RFC 4918
    424 : 'Failed Dependency',          // RFC 4918
    425 : 'Unordered Collection',       // RFC 4918
    426 : 'Upgrade Required',           // RFC 2817
    428 : 'Precondition Required',      // RFC 6585
    429 : 'Too Many Requests',          // RFC 6585
    431 : 'Request Header Fields Too Large', // RFC 6585
    500 : 'Internal Server Error',
    501 : 'Not Implemented',
    502 : 'Bad Gateway',
    503 : 'Service Unavailable',
    504 : 'Gateway Timeout',
    505 : 'HTTP Version Not Supported',
    506 : 'Variant Also Negotiates',    // RFC 2295
    507 : 'Insufficient Storage',       // RFC 4918
    508 : 'Loop Detected',
    509 : 'Bandwidth Limit Exceeded',
    510 : 'Not Extended',               // RFC 2774
    511 : 'Network Authentication Required' // RFC 6585
  }
};

module.exports = utils;
