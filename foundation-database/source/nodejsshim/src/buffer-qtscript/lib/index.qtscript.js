/**
 * Emulate Node.js's global Buffer object using Qt's QByteArray.
 * @See: https://nodejs.org/dist/latest-v4.x/docs/api/buffer.html
 *
 * The code below is a combination of two Buffer shims, modified to use QByteArray.
 * @See: https://github.com/feross/buffer
 * @See: https://github.com/toots/buffer-browserify
 */

var assert;
exports.Buffer = Buffer;
exports.SlowBuffer = Buffer;
Buffer.poolSize = 8192;
exports.INSPECT_MAX_BYTES = 50;

function stringtrim(str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
}

function Buffer(subject, encoding) {
  if(!assert) assert= require('assert');
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding);
  }

  // Work-around: node's base64 implementation
  // allows for non-padded strings while base64-js
  // does not..
  if (encoding == "base64" && typeof subject == "string") {
    subject = stringtrim(subject);
    // Cache `subject.length` so we don't have to call the proxy to
    // `subject.QByteArray.size()` in the while loop below.
    var subjectSize = subject.length;
    while (subjectSize % 4 != 0) {
      subject = subject + "=";
    }
  }

  var type;

  // Find the length
  switch (type = typeof subject) {
    case 'number':
      this.QByteArray = new QByteArray(coerce(subject), 0);
      break;

    case 'string':
      switch (encoding || "utf8") {
        case 'hex':
          this.QByteArray = QByteArray.fromHex(subject);
          break;
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'binary':
          this.QByteArray = new QByteArray(subject);
          break;
        case 'base64':
          this.QByteArray = QByteArray.fromBase64(subject);
          break;
        default:
          throw new Error('Unknown encoding');
          break;
      }
      break;

    case 'object': // Assume object is an array
      if (subject instanceof Buffer) {
        this.QByteArray = new QByteArray(subject.QByteArray);
      } else {
        this.QByteArray = new QByteArray(subject);
      }
      break;

    default:
      throw new TypeError('First argument needs to be a number, ' +
        'array or string.');
  }

  this.parent = this;
  this.offset = 0;
  this.length = this.QByteArray.size();
  var size = this.length;
  var self = this;

// ############################################################################
// This chunk of code allows array index access to buffers. e.g.
//   `var my42 = buf[42];`
// It also REALLY slows down the creation of large new arrays. e.g.
//   `var buf = new Buffer(10000);`
// This is because Qt Script is slow at adding a `__defineGetter__` and `__defineSetter__`
// to large buffers. There is no way around this. To have a faster buffer,
// do not expose this code, but all array index access will be broken and
// `myBuffer.get(index)` and `myBuffer.set(index, value)` can be used instead.
// ############################################################################

// TODO: http-parser-js needs array access. Refactor it.
// Disable the array index access feature...

  // This has to be a wrapper function so index is locked to each value.
  var defineSetterGettter = function (index) {
    self.__defineGetter__(index, function () {
      //debugger;
      return self.get(index);
    });
    self.__defineSetter__(index, function (value) {
      //debugger;
      self.set(index, value);
    });
  };

  // Treat array-ish objects as a byte array.
  if (isArrayIsh(subject)) {
    for (var i = 0; i < size; i++) {
      if (subject instanceof Buffer) {
        this.QByteArray.replace(i, 1, QByteArray(1, subject.readUInt8(i)));
      }
      else {
        // Round-up subject[i] to a UInt8.
        // e.g.: ((-432 % 256) + 256) % 256 = (-176 + 256) % 256
        //                                  = 80
        this.set(i, ((subject.get(i) % 256) + 256) % 256);
      }
    }
  } else if (type == 'string') {
    this.write(subject, 0, encoding);
    this.length = this.QByteArray.size();
  } else if (type === 'number') {
    for (var i = 0; i < size; i++) {
      defineSetterGettter(i);
    }

    this.QByteArray.fill(0);
  }


// ############################################################################
// End Buffer array index access code.
// ############################################################################

  return this;
}

Buffer.prototype.get = function get(i, noAssert) {
  if (i < 0 || i >= this.length) {
    if (noAssert) {
      return false;
    } else {
      throw new Error('oob');
    }
  }

  var mask = (1 << 8) -1;
  var value = this.QByteArray.at(i) & mask;
  return value;
};

Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  var self = this;

  this.QByteArray.replace(i, 1, QByteArray(1, v));
};

Buffer.fromQByteArray = function (qba) {
  var buf = new Buffer(qba.size());
  buf.QByteArray = qba;
  return buf;
};

Buffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).size();

    case 'ascii':
    case 'binary':
      return str.length;

    case 'base64':
      return base64ToBytes(str).size();

    default:
      throw new Error('Unknown encoding');
  }
};

Buffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

Buffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

Buffer.prototype.binaryWrite = Buffer.prototype.asciiWrite;

Buffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

Buffer.prototype.base64Slice = function (start, end) {
  var ret = "";
  if (start === 0 && end === this.length) {
    ret += this.QByteArray.toBase64();
  } else {
    var bytes = this.slice(start, end);
    ret += bytes.QByteArray.toBase64();
  }
  return ret;
};

Buffer.prototype.utf8Slice = function (start, end) {
  var ret = "";
  if (start === 0 && end === this.length) {
    ret += this.QByteArray.toLocal8Bit();
  } else {
    var bytes = this.slice(start, end);
    ret += bytes.QByteArray.toLocal8Bit();
  }
  return ret;
};

Buffer.prototype.asciiSlice = function (start, end) {
  var ret = "";
  if (start === 0 && end === this.length) {
    ret += this.QByteArray.toLatin1();
  } else {
    var bytes = this.slice(start, end);
    ret += bytes.QByteArray.toLatin1();
  }
  return ret;
};

Buffer.prototype.binarySlice = Buffer.prototype.asciiSlice;

Buffer.prototype.inspect = function() {
  var out = [],
    len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this.get(i));
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.hexSlice = function(start, end) {
  var ret = "";
  if (start === 0 && end === this.length) {
    ret += this.QByteArray.toHex();
  } else {
    var bytes = this.slice(start, end);
    ret += bytes.QByteArray.toHex();
  }
  return ret;
};


Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


Buffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var b = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(b)) throw new Error('Invalid hex string');
    this.set(offset + i, b);
  }
  Buffer._charsWritten = i * 2;
  return i;
};


Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};

Buffer.prototype.slice = function(start, end) {
  return Buffer.fromQByteArray(this.QByteArray.slice(start, end));
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  if (end === undefined || isNaN(end)) {
    end = this.length;
  }
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  var newQba = this.QByteArray.slice(start, end);
  target.QByteArray.replace(target_start, (end - start), newQba);
};

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  // Cache `this.length` so we don't have to call the proxy to
  // `this.QByteArray.size()` several times below.
  var size = this.length;
  value || (value = 0);
  start || (start = 0);
  end || (end = size);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (size == 0) return 0;

  if (start < 0 || start >= size) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > size) {
    throw new Error('end out of bounds');
  }

  var newQba = new QByteArray((end - start), 0);
  newQba.fill(value);
  this.QByteArray.replace(start, (end - start), newQba);

  return this;
};

// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer;
};

Buffer.concat = function (list, totalLength) {
  if (!Array.isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
    list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

Buffer.isEncoding = function(encoding) {
  switch ((encoding + '').toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
    case 'raw':
      return true;

    default:
      return false;
  }
};

// helpers
function coerce(length) {
  return length < 0 ? 0 : (length | 0) | 0;
}

function isArrayIsh(subject) {
  return Array.isArray(subject) || subject instanceof Buffer ||
    subject && typeof subject === 'object' &&
    typeof subject.length === 'number';
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  return new QByteArray(str);
}

function asciiToBytes(str) {
  return new QByteArray(str);
}

function base64ToBytes(str) {
  return QByteArray.fromBase64(str);
}

function blitBuffer(src, dst, offset, length) {
  // Cache `src.length` and `dst.length` so we don't have to call the proxy to
  // `this.QByteArray.size()` in the for loops below.
  var size = src.size();
  dst.QByteArray.replace(offset, size, src);
  return size;
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

// read/write bit-twiddling

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset < buffer.length,
      'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer.get(offset);
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  // Cache `buffer.length` so we don't have to call the proxy to
  // `this.QByteArray.size()` in the for loops below.
  var size = buffer.length;
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
      'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset + 1 < size,
      'Trying to read beyond buffer length');
  }

  if (offset >= size) return 0;

  if (isBigEndian) {
    val = buffer.get(offset) << 8;
    if (offset + 1 < size) {
      val |= buffer.get(offset + 1);
    }
  } else {
    val = buffer.get(offset);
    if (offset + 1 < size) {
      val |= buffer.get(offset + 1) << 8;
    }
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return this.QByteArray.readUInt16LE(offset, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return this.QByteArray.readUInt16BE(offset, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  // Cache `buffer.length` so we don't have to call the proxy to
  // `this.QByteArray.size()` in the for loops below.
  var size = buffer.length;
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
      'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset + 3 < size,
      'Trying to read beyond buffer length');
  }

  if (offset >= size) return 0;

  if (isBigEndian) {
    if (offset + 1 < size) {
      val = buffer.get(offset + 1) << 16;
    }
    if (offset + 2 < size) {
      val |= buffer.get(offset + 2) << 8;
    }
    if (offset + 3 < size) {
      val |= buffer.get(offset + 3);
    }
    val = val + (buffer.get(offset) << 24 >>> 0);
  } else {
    if (offset + 2 < size) {
      val = buffer.get(offset + 2) << 16;
    }
    if (offset + 1 < size) {
      val |= buffer.get(offset + 1) << 8;
    }
    val |= buffer.get(offset);
    if (offset + 3 < size) {
      val = val + (buffer.get(offset + 3) << 24 >>> 0);
    }
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return this.QByteArray.readUInt32LE(offset, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return this.QByteArray.readUInt32BE(offset, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset < buffer.length,
      'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  neg = buffer.get(offset) & 0x80;
  if (!neg) {
    return (buffer.get(offset));
  }

  return ((0xff - buffer.get(offset) + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
      'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset + 1 < buffer.length,
      'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return this.QByteArray.readInt16LE(offset, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return this.QByteArray.readInt16BE(offset, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
      'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset + 3 < buffer.length,
      'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return this.QByteArray.readInt32LE(offset, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return this.QByteArray.readInt32BE(offset, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (offset === undefined || offset === null) {
    offset = 0;
  }
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
      'missing or invalid endian');

    assert.ok(offset + 4 <= buffer.length,
      'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
    23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (offset === undefined || offset === null) {
    offset = 0;
  }
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
      'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
      'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
    52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
    'cannot write a non-number as a number');

  assert.ok(value >= 0,
    'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
      'missing value');

    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset < buffer.length,
      'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  if (offset < buffer.length) {
    buffer.set(offset, value);
  }
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  // Cache `buffer.length` so we don't have to call the proxy to
  // `this.QByteArray.size()` in the for loops below.
  var size = buffer.length;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
      'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
      'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset + 1 < size,
      'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  for (var i = 0; i < Math.min(size - offset, 2); i++) {
    buffer.set(offset + i, ((value & (0xff << (8 * (isBigEndian ? 1 - i : i)))) >>>
    (isBigEndian ? 1 - i : i) * 8));
  }

}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  // Cache `buffer.length` so we don't have to call the proxy to
  // `this.QByteArray.size()` in the for loops below.
  var size = buffer.length;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
      'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
      'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset + 3 < size,
      'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  for (var i = 0; i < Math.min(size - offset, 4); i++) {
    buffer.set(offset + i, ((value >>> (isBigEndian ? 3 - i : i) * 8) & 0xff));
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
    'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
    'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
      'missing value');

    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset < buffer.length,
      'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
      'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
      'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset + 1 < buffer.length,
      'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
      'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
      'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset + 3 < buffer.length,
      'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
      'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
      'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset + 3 < buffer.length,
      'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
    23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
      'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
      'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
      'missing offset');

    assert.ok(offset + 7 < buffer.length,
      'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
    52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};
