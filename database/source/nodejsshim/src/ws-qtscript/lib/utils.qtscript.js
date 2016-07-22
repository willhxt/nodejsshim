/**
 * Helper function to convert the hash's encoded data to a Qt QByteArray.
 *
 * @param {String | Buffer} data - The data to hash. If data is a Buffer then encoding is ignored.
 * @param {String} [encoding] - The encoding given can be 'utf8', 'ascii' or 'binary'.
 *   If no encoding is provided, and the input is a string, an encoding of 'binary' is enforced.
 * @return {QByteArray | Boolean} - A QByteArray of the data.
 * @private
 */
var _convertEncodingToQByteArray = function _convertEncodingToQByteArray (data, encoding) {
  var qba;
  if (Buffer.isBuffer(data)) {
    if (data.QByteArray) {
      //qba = new QByteArray(data.QByteArray);
      qba = data.QByteArray;
    } else {
      qba = new QByteArray(data.length, 0);
      var size = data.length;
      for (var i = 0; i < size; i++) {
        qba.replace(i, 1, QByteArray(1, data[i]));
      }
    }
  } else {
    switch (encoding) {
      // TODO: Do we need to do any conversion?
      case 'ascii':
      case 'binary':
      case 'utf8':
        qba = new QByteArray(data);
        break;
      default:
        if (typeof data === 'string') {
          // Node.js's default is 'binary'.
          qba = _convertEncodingToQByteArray (data, 'binary')
        } else {
          return false;
        }
    }
  }

  return qba;
};

/**
 * Helper function to convert a Qt QByteArray to the encoding format.
 *
 * @param {QByteArray} qba - The QByteArray to convert.
 * @param {String} [encoding] - The encoding can be 'hex', 'binary' or 'base64'.
 *   If no encoding is provided, then a buffer is returned.
 * @return {String | Buffer} - The encoded QByteArray data.
 * @private
 */
var _convertQByteArrayToEncoding = function _convertQByteArrayToEncoding (qba, encoding) {
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
};

/**
 * Helper function to get the IP protocol.
 *
 * @param {Number} [input] - The address to get the IP protocol for.
 * @return {String | Boolean} - The IP protocol or false.
 * @private
 */
var _getIpProtocol = function _getIpProtocol (input) {
  var address = new QHostAddress(input);

  if (address.isNull()) {
    return false;
  } else {
    return _mapIpProtocol(address.protocol());
  }
};

/**
 * Helper function to get the IP protocol.
 *
 * @param {Number} networkLayerProtocol - The `enum QAbstractSocket::NetworkLayerProtocol` integer.
 * @return {String} - The IP protocol.
 * @private
 */
var _mapIpProtocol = function _mapIpProtocol (networkLayerProtocol) {
  switch (networkLayerProtocol) {
    case 0:
      return 'IPv4';
    case 1:
      return 'IPv6';
    default:
      return null;
  }
};

module.exports = {
  _convertEncodingToQByteArray: _convertEncodingToQByteArray,
  _convertQByteArrayToEncoding: _convertQByteArrayToEncoding,
  _getIpProtocol: _getIpProtocol,
  _mapIpProtocol: _mapIpProtocol
};
