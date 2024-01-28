(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":3,"ieee754":4}],4:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
const { CohereClient } = require("cohere-ai");

const cohere = new CohereClient({
    token: "xps8bJBB81WIxyE5nwzXKC8DlYltL3tvhsfDY1a1",
});

async function makeStory(location, time) {
  const storyblock = document.getElementById('story');

  const generate = await cohere.generate({
      prompt: `2 fun facts about ${location} during the ${time}`,
      max_tokens: 80,
  });

  const textWithBreaks = generate.generations[0].text.replace(/\n/g, '<br />');
  const p = document.createElement('p');
  p.innerHTML = textWithBreaks;
  storyblock.appendChild(p);

  console.log(generate);
};

module.exports = { makeStory };
},{"cohere-ai":191}],6:[function(require,module,exports){
async function sendToGooey(event, ibb_url, location, time) {
  event.preventDefault();
  console.log(ibb_url);

  const payload = {
      "input_image": ibb_url,
      "text_prompt": `in ${location} in the ${time}`,
      "negative_prompt": "people",
  }

  const response = await fetch("https://api.gooey.ai/v2/ObjectInpainting/", {
      method: 'POST',
      headers: {
          "Authorization": `Bearer sk-Uoonkr50AneY17EACwYytduIBiV4zpn35C7UIjT9sodYv6zw`,
          "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
  })
  const data = await response.json();
  console.log(data);
  const transformedUrl = data.output.output_images[0];
  console.log(transformedUrl);
  const img = document.createElement('img');
  img.src = transformedUrl;
  document.body.appendChild(img);
};

module.exports = { sendToGooey };
},{}],7:[function(require,module,exports){
async function sendToImgbb(event) {
  const selectedFile = event.target.files[0];
  let ibb_url = 'k';

  if (selectedFile) {
      const formData = new FormData();
      formData.append('expiration', 300);
      formData.append('key', '60cfabd40a0dc9accdb250458d9f27e6');
      formData.append('image', selectedFile);

      const response = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: formData
      })
      const data = await response.json();
      return data.data.image.url;
  }
};

module.exports = { sendToImgbb };
},{}],8:[function(require,module,exports){
const { sendToImgbb } = require('./imgbb');
const { sendToGooey } = require('./gooey');
const { makeStory } = require('./cohere');

console.log("Hello World!");

let ibb_url = 'a';

document.getElementById('photo').addEventListener('change', async function(event) {
    ibb_url = await sendToImgbb(event);
    console.log(ibb_url);
});

document.getElementById('img-form').addEventListener('submit', async function(event) {
    const location = document.getElementById('location').value;
    const time = document.getElementById('time').value;
    const storyblock = document.getElementById('story');

    const h2 = document.createElement('h2');
    h2.textContent = `${location} during the ${time}`;
    storyblock.appendChild(h2);

    const h6 = document.createElement('h6');
    h6.textContent = "content generated by cohere.com";
    storyblock.appendChild(h6);
    
    await sendToGooey(event, ibb_url, location, time);
    await makeStory(location, time);
});
},{"./cohere":5,"./gooey":6,"./imgbb":7}],9:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');

var callBind = require('./');

var $indexOf = callBind(GetIntrinsic('String.prototype.indexOf'));

module.exports = function callBoundIntrinsic(name, allowMissing) {
	var intrinsic = GetIntrinsic(name, !!allowMissing);
	if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
		return callBind(intrinsic);
	}
	return intrinsic;
};

},{"./":10,"get-intrinsic":318}],10:[function(require,module,exports){
'use strict';

var bind = require('function-bind');
var GetIntrinsic = require('get-intrinsic');
var setFunctionLength = require('set-function-length');

var $TypeError = GetIntrinsic('%TypeError%');
var $apply = GetIntrinsic('%Function.prototype.apply%');
var $call = GetIntrinsic('%Function.prototype.call%');
var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);

var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);
var $max = GetIntrinsic('%Math.max%');

if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = null;
	}
}

module.exports = function callBind(originalFunction) {
	if (typeof originalFunction !== 'function') {
		throw new $TypeError('a function is required');
	}
	var func = $reflectApply(bind, $call, arguments);
	return setFunctionLength(
		func,
		1 + $max(0, originalFunction.length - (arguments.length - 1)),
		true
	);
};

var applyBind = function applyBind() {
	return $reflectApply(bind, $apply, arguments);
};

if ($defineProperty) {
	$defineProperty(module.exports, 'apply', { value: applyBind });
} else {
	module.exports.apply = applyBind;
}

},{"function-bind":317,"get-intrinsic":318,"set-function-length":333}],11:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohereClient = void 0;
const environments = __importStar(require("./environments"));
const core = __importStar(require("./core"));
const Cohere = __importStar(require("./api"));
const serializers = __importStar(require("./serialization"));
const url_join_1 = __importDefault(require("url-join"));
const errors = __importStar(require("./errors"));
const Client_1 = require("./api/resources/embedJobs/client/Client");
const Client_2 = require("./api/resources/datasets/client/Client");
const Client_3 = require("./api/resources/connectors/client/Client");
class CohereClient {
    constructor(_options) {
        this._options = _options;
    }
    /**
     * The `chat` endpoint allows users to have conversations with a Large Language Model (LLM) from Cohere. Users can send messages as part of a persisted conversation using the `conversation_id` parameter, or they can pass in their own conversation history using the `chat_history` parameter.
     *
     * The endpoint features additional parameters such as [connectors](https://docs.cohere.com/docs/connectors) and `documents` that enable conversations enriched by external knowledge. We call this ["Retrieval Augmented Generation"](https://docs.cohere.com/docs/retrieval-augmented-generation-rag), or "RAG". For a full breakdown of the Chat API endpoint, document and connector modes, and streaming (with code samples), see [this guide](https://docs.cohere.com/docs/cochat-beta).
     */
    chatStream(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "chat"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: Object.assign(Object.assign({}, (yield serializers.ChatStreamRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }))), { stream: true }),
                responseType: "streaming",
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return new core.Stream({
                    stream: _response.body,
                    terminator: "\n",
                    parse: (data) => __awaiter(this, void 0, void 0, function* () {
                        return yield serializers.StreamedChatResponse.parseOrThrow(data, {
                            unrecognizedObjectKeys: "passthrough",
                            allowUnrecognizedUnionMembers: true,
                            allowUnrecognizedEnumValues: true,
                            skipValidation: true,
                            breadcrumbsPrefix: ["response"],
                        });
                    }),
                });
            }
            if (_response.error.reason === "status-code") {
                throw new errors.CohereError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.body,
                });
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * The `chat` endpoint allows users to have conversations with a Large Language Model (LLM) from Cohere. Users can send messages as part of a persisted conversation using the `conversation_id` parameter, or they can pass in their own conversation history using the `chat_history` parameter.
     *
     * The endpoint features additional parameters such as [connectors](https://docs.cohere.com/docs/connectors) and `documents` that enable conversations enriched by external knowledge. We call this ["Retrieval Augmented Generation"](https://docs.cohere.com/docs/retrieval-augmented-generation-rag), or "RAG". For a full breakdown of the Chat API endpoint, document and connector modes, and streaming (with code samples), see [this guide](https://docs.cohere.com/docs/cochat-beta).
     */
    chat(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "chat"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: Object.assign(Object.assign({}, (yield serializers.ChatRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }))), { stream: false }),
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.NonStreamedChatResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                throw new errors.CohereError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.body,
                });
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * This endpoint generates realistic text conditioned on a given input.
     */
    generateStream(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "generate"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: Object.assign(Object.assign({}, (yield serializers.GenerateStreamRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }))), { stream: true }),
                responseType: "streaming",
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return new core.Stream({
                    stream: _response.body,
                    terminator: "\n",
                    parse: (data) => __awaiter(this, void 0, void 0, function* () {
                        return yield serializers.GenerateStreamedResponse.parseOrThrow(data, {
                            unrecognizedObjectKeys: "passthrough",
                            allowUnrecognizedUnionMembers: true,
                            allowUnrecognizedEnumValues: true,
                            skipValidation: true,
                            breadcrumbsPrefix: ["response"],
                        });
                    }),
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * This endpoint generates realistic text conditioned on a given input.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.InternalServerError}
     */
    generate(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "generate"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: Object.assign(Object.assign({}, (yield serializers.GenerateRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }))), { stream: false }),
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.Generation.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * This endpoint returns text embeddings. An embedding is a list of floating point numbers that captures semantic information about the text that it represents.
     *
     * Embeddings can be used to create text classifiers as well as empower semantic search. To learn more about embeddings, see the embedding page.
     *
     * If you want to learn more how to use the embedding model, have a look at the [Semantic Search Guide](/docs/semantic-search).
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.InternalServerError}
     */
    embed(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "embed"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: yield serializers.EmbedRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.EmbedResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * This endpoint takes in a query and a list of texts and produces an ordered array with each text assigned a relevance score.
     */
    rerank(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "rerank"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: yield serializers.RerankRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.RerankResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                throw new errors.CohereError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.body,
                });
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * This endpoint makes a prediction about which label fits the specified text inputs best. To make a prediction, Classify uses the provided `examples` of text + label pairs as a reference.
     * Note: [Fine-tuned models](https://docs.cohere.com/docs/classify-fine-tuning) trained on classification examples don't require the `examples` parameter to be passed in explicitly.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.InternalServerError}
     */
    classify(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "classify"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: yield serializers.ClassifyRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.ClassifyResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * This endpoint identifies which language each of the provided texts is written in.
     *
     * @example
     *     await cohere.detectLanguage({
     *         texts: []
     *     })
     */
    detectLanguage(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "detect-language"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: yield serializers.DetectLanguageRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.DetectLanguageResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                throw new errors.CohereError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.body,
                });
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * This endpoint generates a summary in English for a given text.
     */
    summarize(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "summarize"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: yield serializers.SummarizeRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.SummarizeResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                throw new errors.CohereError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.body,
                });
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * This endpoint splits input text into smaller units called tokens using byte-pair encoding (BPE). To learn more about tokenization and byte pair encoding, see the tokens page.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.InternalServerError}
     */
    tokenize(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "tokenize"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: yield serializers.TokenizeRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.TokenizeResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * This endpoint takes tokens using byte-pair encoding and returns their text representation. To learn more about tokenization and byte pair encoding, see the tokens page.
     */
    detokenize(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "detokenize"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: yield serializers.DetokenizeRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.DetokenizeResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                throw new errors.CohereError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.body,
                });
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    get embedJobs() {
        var _a;
        return ((_a = this._embedJobs) !== null && _a !== void 0 ? _a : (this._embedJobs = new Client_1.EmbedJobs(this._options)));
    }
    get datasets() {
        var _a;
        return ((_a = this._datasets) !== null && _a !== void 0 ? _a : (this._datasets = new Client_2.Datasets(this._options)));
    }
    get connectors() {
        var _a;
        return ((_a = this._connectors) !== null && _a !== void 0 ? _a : (this._connectors = new Client_3.Connectors(this._options)));
    }
    _getAuthorizationHeader() {
        return __awaiter(this, void 0, void 0, function* () {
            return `Bearer ${yield core.Supplier.get(this._options.token)}`;
        });
    }
}
exports.CohereClient = CohereClient;

},{"./api":19,"./api/resources/connectors/client/Client":20,"./api/resources/datasets/client/Client":24,"./api/resources/embedJobs/client/Client":33,"./core":135,"./environments":187,"./errors":190,"./serialization":205,"url-join":335}],12:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./requests"), exports);

},{"./requests":13}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],14:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadRequestError = void 0;
const errors = __importStar(require("../../errors"));
class BadRequestError extends errors.CohereError {
    constructor(body) {
        super({
            message: "BadRequestError",
            statusCode: 400,
            body: body,
        });
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
}
exports.BadRequestError = BadRequestError;

},{"../../errors":190}],15:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForbiddenError = void 0;
const errors = __importStar(require("../../errors"));
class ForbiddenError extends errors.CohereError {
    constructor(body) {
        super({
            message: "ForbiddenError",
            statusCode: 403,
            body: body,
        });
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}
exports.ForbiddenError = ForbiddenError;

},{"../../errors":190}],16:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalServerError = void 0;
const errors = __importStar(require("../../errors"));
class InternalServerError extends errors.CohereError {
    constructor(body) {
        super({
            message: "InternalServerError",
            statusCode: 500,
            body: body,
        });
        Object.setPrototypeOf(this, InternalServerError.prototype);
    }
}
exports.InternalServerError = InternalServerError;

},{"../../errors":190}],17:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundError = void 0;
const errors = __importStar(require("../../errors"));
class NotFoundError extends errors.CohereError {
    constructor(body) {
        super({
            message: "NotFoundError",
            statusCode: 404,
            body: body,
        });
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
exports.NotFoundError = NotFoundError;

},{"../../errors":190}],18:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./BadRequestError"), exports);
__exportStar(require("./ForbiddenError"), exports);
__exportStar(require("./NotFoundError"), exports);
__exportStar(require("./InternalServerError"), exports);

},{"./BadRequestError":14,"./ForbiddenError":15,"./InternalServerError":16,"./NotFoundError":17}],19:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./resources"), exports);
__exportStar(require("./types"), exports);
__exportStar(require("./errors"), exports);
__exportStar(require("./client"), exports);

},{"./client":12,"./errors":18,"./resources":39,"./types":127}],20:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connectors = void 0;
const environments = __importStar(require("../../../../environments"));
const core = __importStar(require("../../../../core"));
const Cohere = __importStar(require("../../.."));
const url_join_1 = __importDefault(require("url-join"));
const serializers = __importStar(require("../../../../serialization"));
const errors = __importStar(require("../../../../errors"));
class Connectors {
    constructor(_options) {
        this._options = _options;
    }
    /**
     * Returns a list of connectors ordered by descending creation date (newer first). See ['Managing your Connector'](https://docs.cohere.com/docs/managing-your-connector) for more information.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.InternalServerError}
     *
     * @example
     *     await cohere.connectors.list({})
     */
    list(request = {}, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { limit, offset } = request;
            const _queryParams = {};
            if (limit != null) {
                _queryParams["limit"] = limit.toString();
            }
            if (offset != null) {
                _queryParams["offset"] = offset.toString();
            }
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "connectors"),
                method: "GET",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                queryParameters: _queryParams,
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.ListConnectorsResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * Creates a new connector. The connector is tested during registration and will cancel registration when the test is unsuccessful. See ['Creating and Deploying a Connector'](https://docs.cohere.com/docs/creating-and-deploying-a-connector) for more information.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.ForbiddenError}
     * @throws {@link Cohere.InternalServerError}
     */
    create(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "connectors"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: yield serializers.CreateConnectorRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.CreateConnectorResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 403:
                        throw new Cohere.ForbiddenError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * Retrieve a connector by ID. See ['Connectors'](https://docs.cohere.com/docs/connectors) for more information.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.NotFoundError}
     * @throws {@link Cohere.InternalServerError}
     */
    get(id, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, `connectors/${id}`),
                method: "GET",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.GetConnectorResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 404:
                        throw new Cohere.NotFoundError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * Delete a connector by ID. See ['Connectors'](https://docs.cohere.com/docs/connectors) for more information.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.ForbiddenError}
     * @throws {@link Cohere.NotFoundError}
     * @throws {@link Cohere.InternalServerError}
     *
     * @example
     *     await cohere.connectors.delete("id")
     */
    delete(id, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, `connectors/${id}`),
                method: "DELETE",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.DeleteConnectorResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 403:
                        throw new Cohere.ForbiddenError(_response.error.body);
                    case 404:
                        throw new Cohere.NotFoundError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * Update a connector by ID. Omitted fields will not be updated. See ['Managing your Connector'](https://docs.cohere.com/docs/managing-your-connector) for more information.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.ForbiddenError}
     * @throws {@link Cohere.NotFoundError}
     * @throws {@link Cohere.InternalServerError}
     */
    update(id, request = {}, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, `connectors/${id}`),
                method: "PATCH",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: yield serializers.UpdateConnectorRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.UpdateConnectorResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 403:
                        throw new Cohere.ForbiddenError(_response.error.body);
                    case 404:
                        throw new Cohere.NotFoundError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * Authorize the connector with the given ID for the connector oauth app. See ['Connector Authentication'](https://docs.cohere.com/docs/connector-authentication) for more information.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.NotFoundError}
     * @throws {@link Cohere.InternalServerError}
     *
     * @example
     *     await cohere.connectors.oAuthAuthorize("id", {})
     */
    oAuthAuthorize(id, request = {}, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { afterTokenRedirect } = request;
            const _queryParams = {};
            if (afterTokenRedirect != null) {
                _queryParams["after_token_redirect"] = afterTokenRedirect;
            }
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, `connectors/${id}/oauth/authorize`),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                queryParameters: _queryParams,
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.OAuthAuthorizeResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 404:
                        throw new Cohere.NotFoundError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    _getAuthorizationHeader() {
        return __awaiter(this, void 0, void 0, function* () {
            return `Bearer ${yield core.Supplier.get(this._options.token)}`;
        });
    }
}
exports.Connectors = Connectors;

},{"../../..":19,"../../../../core":135,"../../../../environments":187,"../../../../errors":190,"../../../../serialization":205,"url-join":335}],21:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./requests":22,"dup":12}],22:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"dup":13}],23:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./client"), exports);

},{"./client":21}],24:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Datasets = void 0;
const environments = __importStar(require("../../../../environments"));
const core = __importStar(require("../../../../core"));
const url_join_1 = __importDefault(require("url-join"));
const serializers = __importStar(require("../../../../serialization"));
const errors = __importStar(require("../../../../errors"));
const form_data_1 = __importDefault(require("form-data"));
class Datasets {
    constructor(_options) {
        this._options = _options;
    }
    /**
     * List datasets that have been created.
     *
     * @example
     *     await cohere.datasets.list({})
     */
    list(request = {}, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { datasetType, before, after, limit, offset } = request;
            const _queryParams = {};
            if (datasetType != null) {
                _queryParams["datasetType"] = datasetType;
            }
            if (before != null) {
                _queryParams["before"] = before.toISOString();
            }
            if (after != null) {
                _queryParams["after"] = after.toISOString();
            }
            if (limit != null) {
                _queryParams["limit"] = limit;
            }
            if (offset != null) {
                _queryParams["offset"] = offset;
            }
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "datasets"),
                method: "GET",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                queryParameters: _queryParams,
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.DatasetsListResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                throw new errors.CohereError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.body,
                });
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * Create a dataset by uploading a file. See ['Dataset Creation'](https://docs.cohere.com/docs/datasets#dataset-creation) for more information.
     */
    create(request, data, evalData, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _request = new form_data_1.default();
            _request.append("data", data);
            if (evalData) {
                _request.append("eval_data", evalData);
            }
            const _queryParams = {};
            if (request.name != null) {
                _queryParams["name"] = request.name;
            }
            if (request.type != null) {
                _queryParams["type"] = request.type;
            }
            if (request.keepOriginalFile != null) {
                _queryParams["keep_original_file"] = request.keepOriginalFile;
            }
            if (request.skipMalformedInput != null) {
                _queryParams["skip_malformed_input"] = request.skipMalformedInput;
            }
            if (request.keepFields != null) {
                _queryParams["keep_fields"] = request.keepFields;
            }
            if (request.optionalFields != null) {
                _queryParams["optional_fields"] = request.optionalFields;
            }
            if (request.textSeparator != null) {
                _queryParams["text_separator"] = request.textSeparator;
            }
            if (request.csvDelimiter != null) {
                _queryParams["csv_delimiter"] = request.csvDelimiter;
            }
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "datasets"),
                queryParameters: _queryParams,
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "multipart/form-data; boundary=" + _request.getBoundary(),
                body: _request,
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.DatasetsCreateResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                throw new errors.CohereError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.body,
                });
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * View the dataset storage usage for your Organization. Each Organization can have up to 10GB of storage across all their users.
     *
     * @example
     *     await cohere.datasets.getUsage()
     */
    getUsage(requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "datasets/usage"),
                method: "GET",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.DatasetsGetUsageResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                throw new errors.CohereError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.body,
                });
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * Retrieve a dataset by ID. See ['Datasets'](https://docs.cohere.com/docs/datasets) for more information.
     *
     * @example
     *     await cohere.datasets.get("id")
     */
    get(id, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, `datasets/${id}`),
                method: "GET",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.DatasetsGetResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                throw new errors.CohereError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.body,
                });
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * Delete a dataset by ID. Datasets are automatically deleted after 30 days, but they can also be deleted manually.
     *
     * @example
     *     await cohere.datasets.delete("id")
     */
    delete(id, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, `datasets/${id}`),
                method: "DELETE",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.datasets.delete.Response.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                throw new errors.CohereError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.body,
                });
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    _getAuthorizationHeader() {
        return __awaiter(this, void 0, void 0, function* () {
            return `Bearer ${yield core.Supplier.get(this._options.token)}`;
        });
    }
}
exports.Datasets = Datasets;

},{"../../../../core":135,"../../../../environments":187,"../../../../errors":190,"../../../../serialization":205,"form-data":315,"url-join":335}],25:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./requests":26,"dup":12}],26:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"dup":13}],27:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./types"), exports);
__exportStar(require("./client"), exports);

},{"./client":25,"./types":32}],28:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });

},{}],29:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],30:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],31:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],32:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./DatasetsListResponse"), exports);
__exportStar(require("./DatasetsCreateResponse"), exports);
__exportStar(require("./DatasetsGetUsageResponse"), exports);
__exportStar(require("./DatasetsGetResponse"), exports);

},{"./DatasetsCreateResponse":28,"./DatasetsGetResponse":29,"./DatasetsGetUsageResponse":30,"./DatasetsListResponse":31}],33:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedJobs = void 0;
const environments = __importStar(require("../../../../environments"));
const core = __importStar(require("../../../../core"));
const Cohere = __importStar(require("../../.."));
const url_join_1 = __importDefault(require("url-join"));
const serializers = __importStar(require("../../../../serialization"));
const errors = __importStar(require("../../../../errors"));
class EmbedJobs {
    constructor(_options) {
        this._options = _options;
    }
    /**
     * The list embed job endpoint allows users to view all embed jobs history for that specific user.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.InternalServerError}
     *
     * @example
     *     await cohere.embedJobs.list()
     */
    list(requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "embed-jobs"),
                method: "GET",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.ListEmbedJobResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * This API launches an async Embed job for a [Dataset](https://docs.cohere.com/docs/datasets) of type `embed-input`. The result of a completed embed job is new Dataset of type `embed-output`, which contains the original text entries and the corresponding embeddings.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.InternalServerError}
     */
    create(request, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, "embed-jobs"),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                body: yield serializers.CreateEmbedJobRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.CreateEmbedJobResponse.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * This API retrieves the details about an embed job started by the same user.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.NotFoundError}
     * @throws {@link Cohere.InternalServerError}
     */
    get(id, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, `embed-jobs/${id}`),
                method: "GET",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return yield serializers.EmbedJob.parseOrThrow(_response.body, {
                    unrecognizedObjectKeys: "passthrough",
                    allowUnrecognizedUnionMembers: true,
                    allowUnrecognizedEnumValues: true,
                    skipValidation: true,
                    breadcrumbsPrefix: ["response"],
                });
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 404:
                        throw new Cohere.NotFoundError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    /**
     * This API allows users to cancel an active embed job. Once invoked, the embedding process will be terminated, and users will be charged for the embeddings processed up to the cancellation point. It's important to note that partial results will not be available to users after cancellation.
     * @throws {@link Cohere.BadRequestError}
     * @throws {@link Cohere.NotFoundError}
     * @throws {@link Cohere.InternalServerError}
     *
     * @example
     *     await cohere.embedJobs.cancel("id")
     */
    cancel(id, requestOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const _response = yield core.fetcher({
                url: (0, url_join_1.default)((_a = (yield core.Supplier.get(this._options.environment))) !== null && _a !== void 0 ? _a : environments.CohereEnvironment.Production, `embed-jobs/${id}/cancel`),
                method: "POST",
                headers: {
                    Authorization: yield this._getAuthorizationHeader(),
                    "X-Client-Name": (yield core.Supplier.get(this._options.clientName)) != null
                        ? yield core.Supplier.get(this._options.clientName)
                        : undefined,
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "cohere-ai",
                    "X-Fern-SDK-Version": "7.7.3",
                },
                contentType: "application/json",
                timeoutMs: (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeoutInSeconds) != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
                maxRetries: requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.maxRetries,
            });
            if (_response.ok) {
                return;
            }
            if (_response.error.reason === "status-code") {
                switch (_response.error.statusCode) {
                    case 400:
                        throw new Cohere.BadRequestError(_response.error.body);
                    case 404:
                        throw new Cohere.NotFoundError(_response.error.body);
                    case 500:
                        throw new Cohere.InternalServerError(_response.error.body);
                    default:
                        throw new errors.CohereError({
                            statusCode: _response.error.statusCode,
                            body: _response.error.body,
                        });
                }
            }
            switch (_response.error.reason) {
                case "non-json":
                    throw new errors.CohereError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.rawBody,
                    });
                case "timeout":
                    throw new errors.CohereTimeoutError();
                case "unknown":
                    throw new errors.CohereError({
                        message: _response.error.errorMessage,
                    });
            }
        });
    }
    _getAuthorizationHeader() {
        return __awaiter(this, void 0, void 0, function* () {
            return `Bearer ${yield core.Supplier.get(this._options.token)}`;
        });
    }
}
exports.EmbedJobs = EmbedJobs;

},{"../../..":19,"../../../../core":135,"../../../../environments":187,"../../../../errors":190,"../../../../serialization":205,"url-join":335}],34:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./requests":35,"dup":12}],35:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"dup":13}],36:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"./client":34,"./types":38,"dup":27}],37:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEmbedJobRequestTruncate = void 0;
exports.CreateEmbedJobRequestTruncate = {
    Start: "START",
    End: "END",
};

},{}],38:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./CreateEmbedJobRequestTruncate"), exports);

},{"./CreateEmbedJobRequestTruncate":37}],39:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectors = exports.datasets = exports.embedJobs = void 0;
exports.embedJobs = __importStar(require("./embedJobs"));
__exportStar(require("./embedJobs/types"), exports);
exports.datasets = __importStar(require("./datasets"));
__exportStar(require("./datasets/types"), exports);
exports.connectors = __importStar(require("./connectors"));
__exportStar(require("./embedJobs/client/requests"), exports);
__exportStar(require("./datasets/client/requests"), exports);
__exportStar(require("./connectors/client/requests"), exports);

},{"./connectors":23,"./connectors/client/requests":22,"./datasets":27,"./datasets/client/requests":26,"./datasets/types":32,"./embedJobs":36,"./embedJobs/client/requests":35,"./embedJobs/types":38}],40:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],41:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],42:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],43:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthTokenType = void 0;
exports.AuthTokenType = {
    Bearer: "bearer",
    Basic: "basic",
    Noscheme: "noscheme",
};

},{}],44:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],45:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],46:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],47:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],48:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],49:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessageRole = void 0;
exports.ChatMessageRole = {
    Chatbot: "CHATBOT",
    User: "USER",
};

},{}],50:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRequestCitationQuality = void 0;
exports.ChatRequestCitationQuality = {
    Fast: "fast",
    Accurate: "accurate",
};

},{}],51:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRequestPromptTruncation = void 0;
exports.ChatRequestPromptTruncation = {
    Off: "OFF",
    Auto: "AUTO",
};

},{}],52:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],53:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],54:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],55:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],56:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],57:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStreamEndEventFinishReason = void 0;
exports.ChatStreamEndEventFinishReason = {
    Complete: "COMPLETE",
    ErrorLimit: "ERROR_LIMIT",
    MaxTokens: "MAX_TOKENS",
    Error: "ERROR",
    ErrorToxic: "ERROR_TOXIC",
};

},{}],58:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],59:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],60:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStreamRequestCitationQuality = void 0;
exports.ChatStreamRequestCitationQuality = {
    Fast: "fast",
    Accurate: "accurate",
};

},{}],61:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStreamRequestPromptTruncation = void 0;
exports.ChatStreamRequestPromptTruncation = {
    Off: "OFF",
    Auto: "AUTO",
};

},{}],62:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],63:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],64:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],65:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassifyRequestTruncate = void 0;
exports.ClassifyRequestTruncate = {
    None: "NONE",
    Start: "START",
    End: "END",
};

},{}],66:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],67:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],68:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassifyResponseClassificationsItemClassificationType = void 0;
exports.ClassifyResponseClassificationsItemClassificationType = {
    SingleLabel: "single-label",
    MultiLabel: "multi-label",
};

},{}],69:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],70:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],71:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorAuthStatus = void 0;
exports.ConnectorAuthStatus = {
    Valid: "valid",
    Expired: "expired",
};

},{}],72:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],73:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],74:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],75:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],76:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],77:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],78:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],79:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetType = void 0;
exports.DatasetType = {
    EmbedInput: "embed-input",
    EmbedResult: "embed-result",
    ClusterResult: "cluster-result",
    ClusterOutliers: "cluster-outliers",
    RerankerFinetuneInput: "reranker-finetune-input",
    PromptCompletionFinetuneInput: "prompt-completion-finetune-input",
    SingleLabelClassificationFinetuneInput: "single-label-classification-finetune-input",
    ChatFinetuneInput: "chat-finetune-input",
    MultiLabelClassificationFinetuneInput: "multi-label-classification-finetune-input",
};

},{}],80:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetValidationStatus = void 0;
exports.DatasetValidationStatus = {
    Unknown: "unknown",
    Queued: "queued",
    Processing: "processing",
    Failed: "failed",
    Validated: "validated",
    Skipped: "skipped",
};

},{}],81:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],82:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],83:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],84:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],85:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],86:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],87:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],88:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedInputType = void 0;
exports.EmbedInputType = {
    SearchDocument: "search_document",
    SearchQuery: "search_query",
    Classification: "classification",
    Clustering: "clustering",
};

},{}],89:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],90:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedJobStatus = void 0;
exports.EmbedJobStatus = {
    Processing: "processing",
    Complete: "complete",
    Cancelling: "cancelling",
    Cancelled: "cancelled",
    Failed: "failed",
};

},{}],91:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedJobTruncate = void 0;
exports.EmbedJobTruncate = {
    Start: "START",
    End: "END",
};

},{}],92:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedRequestTruncate = void 0;
exports.EmbedRequestTruncate = {
    None: "NONE",
    Start: "START",
    End: "END",
};

},{}],93:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],94:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinishReason = void 0;
exports.FinishReason = {
    Complete: "COMPLETE",
    Error: "ERROR",
    ErrorToxic: "ERROR_TOXIC",
    ErrorLimit: "ERROR_LIMIT",
    UserCancel: "USER_CANCEL",
    MaxTokens: "MAX_TOKENS",
};

},{}],95:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateRequestReturnLikelihoods = void 0;
exports.GenerateRequestReturnLikelihoods = {
    Generation: "GENERATION",
    All: "ALL",
    None: "NONE",
};

},{}],96:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateRequestTruncate = void 0;
exports.GenerateRequestTruncate = {
    None: "NONE",
    Start: "START",
    End: "END",
};

},{}],97:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],98:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],99:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],100:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],101:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateStreamRequestReturnLikelihoods = void 0;
exports.GenerateStreamRequestReturnLikelihoods = {
    Generation: "GENERATION",
    All: "ALL",
    None: "NONE",
};

},{}],102:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateStreamRequestTruncate = void 0;
exports.GenerateStreamRequestTruncate = {
    None: "NONE",
    Start: "START",
    End: "END",
};

},{}],103:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],104:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],105:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],106:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],107:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],108:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],109:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],110:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],111:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],112:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],113:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],114:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],115:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],116:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],117:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],118:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],119:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],120:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],121:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizeRequestExtractiveness = void 0;
exports.SummarizeRequestExtractiveness = {
    Low: "low",
    Medium: "medium",
    High: "high",
};

},{}],122:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizeRequestFormat = void 0;
exports.SummarizeRequestFormat = {
    Paragraph: "paragraph",
    Bullets: "bullets",
};

},{}],123:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizeRequestLength = void 0;
exports.SummarizeRequestLength = {
    Short: "short",
    Medium: "medium",
    Long: "long",
};

},{}],124:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],125:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],126:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],127:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./ChatStreamRequestPromptTruncation"), exports);
__exportStar(require("./ChatStreamRequestCitationQuality"), exports);
__exportStar(require("./ChatRequestPromptTruncation"), exports);
__exportStar(require("./ChatRequestCitationQuality"), exports);
__exportStar(require("./GenerateStreamRequestTruncate"), exports);
__exportStar(require("./GenerateStreamRequestReturnLikelihoods"), exports);
__exportStar(require("./GenerateRequestTruncate"), exports);
__exportStar(require("./GenerateRequestReturnLikelihoods"), exports);
__exportStar(require("./EmbedRequestTruncate"), exports);
__exportStar(require("./EmbedResponse"), exports);
__exportStar(require("./RerankRequestDocumentsItemText"), exports);
__exportStar(require("./RerankRequestDocumentsItem"), exports);
__exportStar(require("./RerankResponseResultsItemDocument"), exports);
__exportStar(require("./RerankResponseResultsItem"), exports);
__exportStar(require("./RerankResponse"), exports);
__exportStar(require("./ClassifyRequestExamplesItem"), exports);
__exportStar(require("./ClassifyRequestTruncate"), exports);
__exportStar(require("./ClassifyResponseClassificationsItemLabelsValue"), exports);
__exportStar(require("./ClassifyResponseClassificationsItemClassificationType"), exports);
__exportStar(require("./ClassifyResponseClassificationsItem"), exports);
__exportStar(require("./ClassifyResponse"), exports);
__exportStar(require("./DetectLanguageResponseResultsItem"), exports);
__exportStar(require("./DetectLanguageResponse"), exports);
__exportStar(require("./SummarizeRequestLength"), exports);
__exportStar(require("./SummarizeRequestFormat"), exports);
__exportStar(require("./SummarizeRequestExtractiveness"), exports);
__exportStar(require("./SummarizeResponse"), exports);
__exportStar(require("./TokenizeResponse"), exports);
__exportStar(require("./DetokenizeResponse"), exports);
__exportStar(require("./ChatMessageRole"), exports);
__exportStar(require("./ChatMessage"), exports);
__exportStar(require("./ChatConnector"), exports);
__exportStar(require("./ChatDocument"), exports);
__exportStar(require("./ChatCitation"), exports);
__exportStar(require("./ChatSearchQuery"), exports);
__exportStar(require("./ChatSearchResult"), exports);
__exportStar(require("./NonStreamedChatResponse"), exports);
__exportStar(require("./ChatStreamEvent"), exports);
__exportStar(require("./ChatStreamStartEvent"), exports);
__exportStar(require("./ChatSearchQueriesGenerationEvent"), exports);
__exportStar(require("./ChatSearchResultsEvent"), exports);
__exportStar(require("./ChatTextGenerationEvent"), exports);
__exportStar(require("./ChatCitationGenerationEvent"), exports);
__exportStar(require("./SearchQueriesOnlyResponse"), exports);
__exportStar(require("./ChatStreamEndEventFinishReason"), exports);
__exportStar(require("./ChatStreamEndEventResponse"), exports);
__exportStar(require("./ChatStreamEndEvent"), exports);
__exportStar(require("./StreamedChatResponse"), exports);
__exportStar(require("./SingleGenerationTokenLikelihoodsItem"), exports);
__exportStar(require("./SingleGeneration"), exports);
__exportStar(require("./ApiMetaApiVersion"), exports);
__exportStar(require("./ApiMetaBilledUnits"), exports);
__exportStar(require("./ApiMeta"), exports);
__exportStar(require("./Generation"), exports);
__exportStar(require("./GenerateStreamEvent"), exports);
__exportStar(require("./GenerateStreamText"), exports);
__exportStar(require("./FinishReason"), exports);
__exportStar(require("./SingleGenerationInStream"), exports);
__exportStar(require("./GenerateStreamEndResponse"), exports);
__exportStar(require("./GenerateStreamEnd"), exports);
__exportStar(require("./GenerateStreamError"), exports);
__exportStar(require("./GenerateStreamedResponse"), exports);
__exportStar(require("./EmbedInputType"), exports);
__exportStar(require("./EmbedFloatsResponse"), exports);
__exportStar(require("./EmbedByTypeResponseEmbeddings"), exports);
__exportStar(require("./EmbedByTypeResponse"), exports);
__exportStar(require("./EmbedJobStatus"), exports);
__exportStar(require("./EmbedJobTruncate"), exports);
__exportStar(require("./EmbedJob"), exports);
__exportStar(require("./ListEmbedJobResponse"), exports);
__exportStar(require("./CreateEmbedJobResponse"), exports);
__exportStar(require("./DatasetType"), exports);
__exportStar(require("./DatasetValidationStatus"), exports);
__exportStar(require("./DatasetPart"), exports);
__exportStar(require("./Dataset"), exports);
__exportStar(require("./ConnectorOAuth"), exports);
__exportStar(require("./ConnectorAuthStatus"), exports);
__exportStar(require("./Connector"), exports);
__exportStar(require("./ListConnectorsResponse"), exports);
__exportStar(require("./CreateConnectorOAuth"), exports);
__exportStar(require("./AuthTokenType"), exports);
__exportStar(require("./CreateConnectorServiceAuth"), exports);
__exportStar(require("./CreateConnectorResponse"), exports);
__exportStar(require("./GetConnectorResponse"), exports);
__exportStar(require("./DeleteConnectorResponse"), exports);
__exportStar(require("./UpdateConnectorResponse"), exports);
__exportStar(require("./OAuthAuthorizeResponse"), exports);

},{"./ApiMeta":40,"./ApiMetaApiVersion":41,"./ApiMetaBilledUnits":42,"./AuthTokenType":43,"./ChatCitation":44,"./ChatCitationGenerationEvent":45,"./ChatConnector":46,"./ChatDocument":47,"./ChatMessage":48,"./ChatMessageRole":49,"./ChatRequestCitationQuality":50,"./ChatRequestPromptTruncation":51,"./ChatSearchQueriesGenerationEvent":52,"./ChatSearchQuery":53,"./ChatSearchResult":54,"./ChatSearchResultsEvent":55,"./ChatStreamEndEvent":56,"./ChatStreamEndEventFinishReason":57,"./ChatStreamEndEventResponse":58,"./ChatStreamEvent":59,"./ChatStreamRequestCitationQuality":60,"./ChatStreamRequestPromptTruncation":61,"./ChatStreamStartEvent":62,"./ChatTextGenerationEvent":63,"./ClassifyRequestExamplesItem":64,"./ClassifyRequestTruncate":65,"./ClassifyResponse":66,"./ClassifyResponseClassificationsItem":67,"./ClassifyResponseClassificationsItemClassificationType":68,"./ClassifyResponseClassificationsItemLabelsValue":69,"./Connector":70,"./ConnectorAuthStatus":71,"./ConnectorOAuth":72,"./CreateConnectorOAuth":73,"./CreateConnectorResponse":74,"./CreateConnectorServiceAuth":75,"./CreateEmbedJobResponse":76,"./Dataset":77,"./DatasetPart":78,"./DatasetType":79,"./DatasetValidationStatus":80,"./DeleteConnectorResponse":81,"./DetectLanguageResponse":82,"./DetectLanguageResponseResultsItem":83,"./DetokenizeResponse":84,"./EmbedByTypeResponse":85,"./EmbedByTypeResponseEmbeddings":86,"./EmbedFloatsResponse":87,"./EmbedInputType":88,"./EmbedJob":89,"./EmbedJobStatus":90,"./EmbedJobTruncate":91,"./EmbedRequestTruncate":92,"./EmbedResponse":93,"./FinishReason":94,"./GenerateRequestReturnLikelihoods":95,"./GenerateRequestTruncate":96,"./GenerateStreamEnd":97,"./GenerateStreamEndResponse":98,"./GenerateStreamError":99,"./GenerateStreamEvent":100,"./GenerateStreamRequestReturnLikelihoods":101,"./GenerateStreamRequestTruncate":102,"./GenerateStreamText":103,"./GenerateStreamedResponse":104,"./Generation":105,"./GetConnectorResponse":106,"./ListConnectorsResponse":107,"./ListEmbedJobResponse":108,"./NonStreamedChatResponse":109,"./OAuthAuthorizeResponse":110,"./RerankRequestDocumentsItem":111,"./RerankRequestDocumentsItemText":112,"./RerankResponse":113,"./RerankResponseResultsItem":114,"./RerankResponseResultsItemDocument":115,"./SearchQueriesOnlyResponse":116,"./SingleGeneration":117,"./SingleGenerationInStream":118,"./SingleGenerationTokenLikelihoodsItem":119,"./StreamedChatResponse":120,"./SummarizeRequestExtractiveness":121,"./SummarizeRequestFormat":122,"./SummarizeRequestLength":123,"./SummarizeResponse":124,"./TokenizeResponse":125,"./UpdateConnectorResponse":126}],128:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicAuth = void 0;
const js_base64_1 = require("js-base64");
const BASIC_AUTH_HEADER_PREFIX = /^Basic /i;
exports.BasicAuth = {
    toAuthorizationHeader: (basicAuth) => {
        if (basicAuth == null) {
            return undefined;
        }
        const token = js_base64_1.Base64.encode(`${basicAuth.username}:${basicAuth.password}`);
        return `Basic ${token}`;
    },
    fromAuthorizationHeader: (header) => {
        const credentials = header.replace(BASIC_AUTH_HEADER_PREFIX, "");
        const decoded = js_base64_1.Base64.decode(credentials);
        const [username, password] = decoded.split(":", 2);
        if (username == null || password == null) {
            throw new Error("Invalid basic auth");
        }
        return {
            username,
            password,
        };
    },
};

},{"js-base64":325}],129:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BearerToken = void 0;
const BEARER_AUTH_HEADER_PREFIX = /^Bearer /i;
exports.BearerToken = {
    toAuthorizationHeader: (token) => {
        if (token == null) {
            return undefined;
        }
        return `Bearer ${token}`;
    },
    fromAuthorizationHeader: (header) => {
        return header.replace(BEARER_AUTH_HEADER_PREFIX, "").trim();
    },
};

},{}],130:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BearerToken = exports.BasicAuth = void 0;
var BasicAuth_1 = require("./BasicAuth");
Object.defineProperty(exports, "BasicAuth", { enumerable: true, get: function () { return BasicAuth_1.BasicAuth; } });
var BearerToken_1 = require("./BearerToken");
Object.defineProperty(exports, "BearerToken", { enumerable: true, get: function () { return BearerToken_1.BearerToken; } });

},{"./BasicAuth":128,"./BearerToken":129}],131:[function(require,module,exports){
(function (global){(function (){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetcher = void 0;
const form_data_1 = __importDefault(require("form-data"));
const qs_1 = __importDefault(require("qs"));
if (typeof window === "undefined") {
    global.fetch = require("node-fetch");
}
const INITIAL_RETRY_DELAY = 1;
const MAX_RETRY_DELAY = 60;
const DEFAULT_MAX_RETRIES = 2;
function fetcherImpl(args) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const headers = {};
        if (args.body !== undefined && args.contentType != null) {
            headers["Content-Type"] = args.contentType;
        }
        if (args.headers != null) {
            for (const [key, value] of Object.entries(args.headers)) {
                if (value != null) {
                    headers[key] = value;
                }
            }
        }
        const url = Object.keys((_a = args.queryParameters) !== null && _a !== void 0 ? _a : {}).length > 0
            ? `${args.url}?${qs_1.default.stringify(args.queryParameters, { arrayFormat: "repeat" })}`
            : args.url;
        let body = undefined;
        if (args.body instanceof form_data_1.default) {
            // @ts-expect-error
            body = args.body;
        }
        else {
            body = JSON.stringify(args.body);
        }
        const makeRequest = () => __awaiter(this, void 0, void 0, function* () {
            const controller = new AbortController();
            let abortId = undefined;
            if (args.timeoutMs != null) {
                abortId = setTimeout(() => controller.abort(), args.timeoutMs);
            }
            const response = yield fetch(url, {
                method: args.method,
                headers,
                body,
                signal: controller.signal,
                credentials: args.withCredentials ? "same-origin" : undefined,
            });
            if (abortId != null) {
                clearTimeout(abortId);
            }
            return response;
        });
        try {
            let response = yield makeRequest();
            for (let i = 0; i < ((_b = args.maxRetries) !== null && _b !== void 0 ? _b : DEFAULT_MAX_RETRIES); ++i) {
                if (response.status === 408 ||
                    response.status === 409 ||
                    response.status === 429 ||
                    response.status >= 500) {
                    const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(i, 2), MAX_RETRY_DELAY);
                    yield new Promise((resolve) => setTimeout(resolve, delay));
                    response = yield makeRequest();
                }
                else {
                    break;
                }
            }
            let body;
            if (response.body != null && args.responseType === "blob") {
                body = yield response.blob();
            }
            else if (response.body != null && args.responseType === "streaming") {
                body = response.body;
            }
            else if (response.body != null) {
                try {
                    body = yield response.json();
                }
                catch (err) {
                    return {
                        ok: false,
                        error: {
                            reason: "non-json",
                            statusCode: response.status,
                            rawBody: yield response.text(),
                        },
                    };
                }
            }
            if (response.status >= 200 && response.status < 400) {
                return {
                    ok: true,
                    body: body,
                    headers: response.headers,
                };
            }
            else {
                return {
                    ok: false,
                    error: {
                        reason: "status-code",
                        statusCode: response.status,
                        body,
                    },
                };
            }
        }
        catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                return {
                    ok: false,
                    error: {
                        reason: "timeout",
                    },
                };
            }
            else if (error instanceof Error) {
                return {
                    ok: false,
                    error: {
                        reason: "unknown",
                        errorMessage: error.message,
                    },
                };
            }
            return {
                ok: false,
                error: {
                    reason: "unknown",
                    errorMessage: JSON.stringify(error),
                },
            };
        }
    });
}
exports.fetcher = fetcherImpl;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"form-data":315,"node-fetch":326,"qs":329}],132:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Supplier = void 0;
exports.Supplier = {
    get: (supplier) => __awaiter(void 0, void 0, void 0, function* () {
        if (typeof supplier === "function") {
            return supplier();
        }
        else {
            return supplier;
        }
    }),
};

},{}],133:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHeader = void 0;
function getHeader(headers, header) {
    for (const [headerKey, headerValue] of Object.entries(headers)) {
        if (headerKey.toLowerCase() === header.toLowerCase()) {
            return headerValue;
        }
    }
    return undefined;
}
exports.getHeader = getHeader;

},{}],134:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Supplier = exports.getHeader = exports.fetcher = void 0;
var Fetcher_1 = require("./Fetcher");
Object.defineProperty(exports, "fetcher", { enumerable: true, get: function () { return Fetcher_1.fetcher; } });
var getHeader_1 = require("./getHeader");
Object.defineProperty(exports, "getHeader", { enumerable: true, get: function () { return getHeader_1.getHeader; } });
var Supplier_1 = require("./Supplier");
Object.defineProperty(exports, "Supplier", { enumerable: true, get: function () { return Supplier_1.Supplier; } });

},{"./Fetcher":131,"./Supplier":132,"./getHeader":133}],135:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialization = void 0;
__exportStar(require("./fetcher"), exports);
__exportStar(require("./auth"), exports);
__exportStar(require("./streaming-fetcher"), exports);
exports.serialization = __importStar(require("./schemas"));

},{"./auth":130,"./fetcher":134,"./schemas":176,"./streaming-fetcher":186}],136:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaType = void 0;
exports.SchemaType = {
    DATE: "date",
    ENUM: "enum",
    LIST: "list",
    STRING_LITERAL: "stringLiteral",
    BOOLEAN_LITERAL: "booleanLiteral",
    OBJECT: "object",
    ANY: "any",
    BOOLEAN: "boolean",
    NUMBER: "number",
    STRING: "string",
    UNKNOWN: "unknown",
    RECORD: "record",
    SET: "set",
    UNION: "union",
    UNDISCRIMINATED_UNION: "undiscriminatedUnion",
    OPTIONAL: "optional",
};

},{}],137:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.date = void 0;
const Schema_1 = require("../../Schema");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
const maybeSkipValidation_1 = require("../../utils/maybeSkipValidation");
const schema_utils_1 = require("../schema-utils");
// https://stackoverflow.com/questions/12756159/regex-and-iso8601-formatted-datetime
const ISO_8601_REGEX = /^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;
function date() {
    const baseSchema = {
        parse: (raw, { breadcrumbsPrefix = [] } = {}) => {
            if (typeof raw !== "string") {
                return {
                    ok: false,
                    errors: [
                        {
                            path: breadcrumbsPrefix,
                            message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(raw, "string"),
                        },
                    ],
                };
            }
            if (!ISO_8601_REGEX.test(raw)) {
                return {
                    ok: false,
                    errors: [
                        {
                            path: breadcrumbsPrefix,
                            message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(raw, "ISO 8601 date string"),
                        },
                    ],
                };
            }
            return {
                ok: true,
                value: new Date(raw),
            };
        },
        json: (date, { breadcrumbsPrefix = [] } = {}) => {
            if (date instanceof Date) {
                return {
                    ok: true,
                    value: date.toISOString(),
                };
            }
            else {
                return {
                    ok: false,
                    errors: [
                        {
                            path: breadcrumbsPrefix,
                            message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(date, "Date object"),
                        },
                    ],
                };
            }
        },
        getType: () => Schema_1.SchemaType.DATE,
    };
    return Object.assign(Object.assign({}, (0, maybeSkipValidation_1.maybeSkipValidation)(baseSchema)), (0, schema_utils_1.getSchemaUtils)(baseSchema));
}
exports.date = date;

},{"../../Schema":136,"../../utils/getErrorMessageForIncorrectType":180,"../../utils/maybeSkipValidation":183,"../schema-utils":167}],138:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.date = void 0;
var date_1 = require("./date");
Object.defineProperty(exports, "date", { enumerable: true, get: function () { return date_1.date; } });

},{"./date":137}],139:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enum_ = void 0;
const Schema_1 = require("../../Schema");
const createIdentitySchemaCreator_1 = require("../../utils/createIdentitySchemaCreator");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
function enum_(values) {
    const validValues = new Set(values);
    const schemaCreator = (0, createIdentitySchemaCreator_1.createIdentitySchemaCreator)(Schema_1.SchemaType.ENUM, (value, { allowUnrecognizedEnumValues, breadcrumbsPrefix = [] } = {}) => {
        if (typeof value !== "string") {
            return {
                ok: false,
                errors: [
                    {
                        path: breadcrumbsPrefix,
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "string"),
                    },
                ],
            };
        }
        if (!validValues.has(value) && !allowUnrecognizedEnumValues) {
            return {
                ok: false,
                errors: [
                    {
                        path: breadcrumbsPrefix,
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "enum"),
                    },
                ],
            };
        }
        return {
            ok: true,
            value: value,
        };
    });
    return schemaCreator();
}
exports.enum_ = enum_;

},{"../../Schema":136,"../../utils/createIdentitySchemaCreator":177,"../../utils/getErrorMessageForIncorrectType":180}],140:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enum_ = void 0;
var enum_1 = require("./enum");
Object.defineProperty(exports, "enum_", { enumerable: true, get: function () { return enum_1.enum_; } });

},{"./enum":139}],141:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./date"), exports);
__exportStar(require("./enum"), exports);
__exportStar(require("./lazy"), exports);
__exportStar(require("./list"), exports);
__exportStar(require("./literals"), exports);
__exportStar(require("./object"), exports);
__exportStar(require("./object-like"), exports);
__exportStar(require("./primitives"), exports);
__exportStar(require("./record"), exports);
__exportStar(require("./schema-utils"), exports);
__exportStar(require("./set"), exports);
__exportStar(require("./undiscriminated-union"), exports);
__exportStar(require("./union"), exports);

},{"./date":138,"./enum":140,"./lazy":142,"./list":145,"./literals":148,"./object":152,"./object-like":151,"./primitives":158,"./record":162,"./schema-utils":167,"./set":169,"./undiscriminated-union":171,"./union":174}],142:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lazyObject = exports.lazy = void 0;
var lazy_1 = require("./lazy");
Object.defineProperty(exports, "lazy", { enumerable: true, get: function () { return lazy_1.lazy; } });
var lazyObject_1 = require("./lazyObject");
Object.defineProperty(exports, "lazyObject", { enumerable: true, get: function () { return lazyObject_1.lazyObject; } });

},{"./lazy":143,"./lazyObject":144}],143:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemoizedSchema = exports.constructLazyBaseSchema = exports.lazy = void 0;
const schema_utils_1 = require("../schema-utils");
function lazy(getter) {
    const baseSchema = constructLazyBaseSchema(getter);
    return Object.assign(Object.assign({}, baseSchema), (0, schema_utils_1.getSchemaUtils)(baseSchema));
}
exports.lazy = lazy;
function constructLazyBaseSchema(getter) {
    return {
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () { return (yield getMemoizedSchema(getter)).parse(raw, opts); }),
        json: (parsed, opts) => __awaiter(this, void 0, void 0, function* () { return (yield getMemoizedSchema(getter)).json(parsed, opts); }),
        getType: () => __awaiter(this, void 0, void 0, function* () { return (yield getMemoizedSchema(getter)).getType(); }),
    };
}
exports.constructLazyBaseSchema = constructLazyBaseSchema;
function getMemoizedSchema(getter) {
    return __awaiter(this, void 0, void 0, function* () {
        const castedGetter = getter;
        if (castedGetter.__zurg_memoized == null) {
            castedGetter.__zurg_memoized = yield getter();
        }
        return castedGetter.__zurg_memoized;
    });
}
exports.getMemoizedSchema = getMemoizedSchema;

},{"../schema-utils":167}],144:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lazyObject = void 0;
const object_1 = require("../object");
const object_like_1 = require("../object-like");
const schema_utils_1 = require("../schema-utils");
const lazy_1 = require("./lazy");
function lazyObject(getter) {
    const baseSchema = Object.assign(Object.assign({}, (0, lazy_1.constructLazyBaseSchema)(getter)), { _getRawProperties: () => __awaiter(this, void 0, void 0, function* () { return (yield (0, lazy_1.getMemoizedSchema)(getter))._getRawProperties(); }), _getParsedProperties: () => __awaiter(this, void 0, void 0, function* () { return (yield (0, lazy_1.getMemoizedSchema)(getter))._getParsedProperties(); }) });
    return Object.assign(Object.assign(Object.assign(Object.assign({}, baseSchema), (0, schema_utils_1.getSchemaUtils)(baseSchema)), (0, object_like_1.getObjectLikeUtils)(baseSchema)), (0, object_1.getObjectUtils)(baseSchema));
}
exports.lazyObject = lazyObject;

},{"../object":152,"../object-like":151,"../schema-utils":167,"./lazy":143}],145:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = void 0;
var list_1 = require("./list");
Object.defineProperty(exports, "list", { enumerable: true, get: function () { return list_1.list; } });

},{"./list":146}],146:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = void 0;
const Schema_1 = require("../../Schema");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
const maybeSkipValidation_1 = require("../../utils/maybeSkipValidation");
const schema_utils_1 = require("../schema-utils");
function list(schema) {
    const baseSchema = {
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
            return validateAndTransformArray(raw, (item, index) => {
                var _a;
                return schema.parse(item, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), `[${index}]`] }));
            });
        }),
        json: (parsed, opts) => validateAndTransformArray(parsed, (item, index) => {
            var _a;
            return schema.json(item, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), `[${index}]`] }));
        }),
        getType: () => Schema_1.SchemaType.LIST,
    };
    return Object.assign(Object.assign({}, (0, maybeSkipValidation_1.maybeSkipValidation)(baseSchema)), (0, schema_utils_1.getSchemaUtils)(baseSchema));
}
exports.list = list;
function validateAndTransformArray(value, transformItem) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!Array.isArray(value)) {
            return {
                ok: false,
                errors: [
                    {
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "list"),
                        path: [],
                    },
                ],
            };
        }
        const maybeValidItems = yield Promise.all(value.map((item, index) => transformItem(item, index)));
        return maybeValidItems.reduce((acc, item) => {
            if (acc.ok && item.ok) {
                return {
                    ok: true,
                    value: [...acc.value, item.value],
                };
            }
            const errors = [];
            if (!acc.ok) {
                errors.push(...acc.errors);
            }
            if (!item.ok) {
                errors.push(...item.errors);
            }
            return {
                ok: false,
                errors,
            };
        }, { ok: true, value: [] });
    });
}

},{"../../Schema":136,"../../utils/getErrorMessageForIncorrectType":180,"../../utils/maybeSkipValidation":183,"../schema-utils":167}],147:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.booleanLiteral = void 0;
const Schema_1 = require("../../Schema");
const createIdentitySchemaCreator_1 = require("../../utils/createIdentitySchemaCreator");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
function booleanLiteral(literal) {
    const schemaCreator = (0, createIdentitySchemaCreator_1.createIdentitySchemaCreator)(Schema_1.SchemaType.BOOLEAN_LITERAL, (value, { breadcrumbsPrefix = [] } = {}) => {
        if (value === literal) {
            return {
                ok: true,
                value: literal,
            };
        }
        else {
            return {
                ok: false,
                errors: [
                    {
                        path: breadcrumbsPrefix,
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, `${literal.toString()}`),
                    },
                ],
            };
        }
    });
    return schemaCreator();
}
exports.booleanLiteral = booleanLiteral;

},{"../../Schema":136,"../../utils/createIdentitySchemaCreator":177,"../../utils/getErrorMessageForIncorrectType":180}],148:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.booleanLiteral = exports.stringLiteral = void 0;
var stringLiteral_1 = require("./stringLiteral");
Object.defineProperty(exports, "stringLiteral", { enumerable: true, get: function () { return stringLiteral_1.stringLiteral; } });
var booleanLiteral_1 = require("./booleanLiteral");
Object.defineProperty(exports, "booleanLiteral", { enumerable: true, get: function () { return booleanLiteral_1.booleanLiteral; } });

},{"./booleanLiteral":147,"./stringLiteral":149}],149:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringLiteral = void 0;
const Schema_1 = require("../../Schema");
const createIdentitySchemaCreator_1 = require("../../utils/createIdentitySchemaCreator");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
function stringLiteral(literal) {
    const schemaCreator = (0, createIdentitySchemaCreator_1.createIdentitySchemaCreator)(Schema_1.SchemaType.STRING_LITERAL, (value, { breadcrumbsPrefix = [] } = {}) => {
        if (value === literal) {
            return {
                ok: true,
                value: literal,
            };
        }
        else {
            return {
                ok: false,
                errors: [
                    {
                        path: breadcrumbsPrefix,
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, `"${literal}"`),
                    },
                ],
            };
        }
    });
    return schemaCreator();
}
exports.stringLiteral = stringLiteral;

},{"../../Schema":136,"../../utils/createIdentitySchemaCreator":177,"../../utils/getErrorMessageForIncorrectType":180}],150:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withParsedProperties = exports.getObjectLikeUtils = void 0;
const filterObject_1 = require("../../utils/filterObject");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
const isPlainObject_1 = require("../../utils/isPlainObject");
const schema_utils_1 = require("../schema-utils");
function getObjectLikeUtils(schema) {
    return {
        withParsedProperties: (properties) => withParsedProperties(schema, properties),
    };
}
exports.getObjectLikeUtils = getObjectLikeUtils;
/**
 * object-like utils are defined in one file to resolve issues with circular imports
 */
function withParsedProperties(objectLike, properties) {
    const objectSchema = {
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
            const parsedObject = yield objectLike.parse(raw, opts);
            if (!parsedObject.ok) {
                return parsedObject;
            }
            const additionalProperties = Object.entries(properties).reduce((processed, [key, value]) => {
                return Object.assign(Object.assign({}, processed), { [key]: typeof value === "function" ? value(parsedObject.value) : value });
            }, {});
            return {
                ok: true,
                value: Object.assign(Object.assign({}, parsedObject.value), additionalProperties),
            };
        }),
        json: (parsed, opts) => {
            var _a;
            if (!(0, isPlainObject_1.isPlainObject)(parsed)) {
                return {
                    ok: false,
                    errors: [
                        {
                            path: (_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : [],
                            message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(parsed, "object"),
                        },
                    ],
                };
            }
            // strip out added properties
            const addedPropertyKeys = new Set(Object.keys(properties));
            const parsedWithoutAddedProperties = (0, filterObject_1.filterObject)(parsed, Object.keys(parsed).filter((key) => !addedPropertyKeys.has(key)));
            return objectLike.json(parsedWithoutAddedProperties, opts);
        },
        getType: () => objectLike.getType(),
    };
    return Object.assign(Object.assign(Object.assign({}, objectSchema), (0, schema_utils_1.getSchemaUtils)(objectSchema)), getObjectLikeUtils(objectSchema));
}
exports.withParsedProperties = withParsedProperties;

},{"../../utils/filterObject":179,"../../utils/getErrorMessageForIncorrectType":180,"../../utils/isPlainObject":181,"../schema-utils":167}],151:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withParsedProperties = exports.getObjectLikeUtils = void 0;
var getObjectLikeUtils_1 = require("./getObjectLikeUtils");
Object.defineProperty(exports, "getObjectLikeUtils", { enumerable: true, get: function () { return getObjectLikeUtils_1.getObjectLikeUtils; } });
Object.defineProperty(exports, "withParsedProperties", { enumerable: true, get: function () { return getObjectLikeUtils_1.withParsedProperties; } });

},{"./getObjectLikeUtils":150}],152:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.property = exports.isProperty = exports.objectWithoutOptionalProperties = exports.object = exports.getObjectUtils = void 0;
var object_1 = require("./object");
Object.defineProperty(exports, "getObjectUtils", { enumerable: true, get: function () { return object_1.getObjectUtils; } });
Object.defineProperty(exports, "object", { enumerable: true, get: function () { return object_1.object; } });
var objectWithoutOptionalProperties_1 = require("./objectWithoutOptionalProperties");
Object.defineProperty(exports, "objectWithoutOptionalProperties", { enumerable: true, get: function () { return objectWithoutOptionalProperties_1.objectWithoutOptionalProperties; } });
var property_1 = require("./property");
Object.defineProperty(exports, "isProperty", { enumerable: true, get: function () { return property_1.isProperty; } });
Object.defineProperty(exports, "property", { enumerable: true, get: function () { return property_1.property; } });

},{"./object":153,"./objectWithoutOptionalProperties":154,"./property":155}],153:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getObjectUtils = exports.object = void 0;
const Schema_1 = require("../../Schema");
const entries_1 = require("../../utils/entries");
const filterObject_1 = require("../../utils/filterObject");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
const isPlainObject_1 = require("../../utils/isPlainObject");
const keys_1 = require("../../utils/keys");
const maybeSkipValidation_1 = require("../../utils/maybeSkipValidation");
const partition_1 = require("../../utils/partition");
const object_like_1 = require("../object-like");
const schema_utils_1 = require("../schema-utils");
const property_1 = require("./property");
function object(schemas) {
    const baseSchema = {
        _getRawProperties: () => Promise.resolve(Object.entries(schemas).map(([parsedKey, propertySchema]) => (0, property_1.isProperty)(propertySchema) ? propertySchema.rawKey : parsedKey)),
        _getParsedProperties: () => Promise.resolve((0, keys_1.keys)(schemas)),
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
            const rawKeyToProperty = {};
            const requiredKeys = [];
            for (const [parsedKey, schemaOrObjectProperty] of (0, entries_1.entries)(schemas)) {
                const rawKey = (0, property_1.isProperty)(schemaOrObjectProperty) ? schemaOrObjectProperty.rawKey : parsedKey;
                const valueSchema = (0, property_1.isProperty)(schemaOrObjectProperty)
                    ? schemaOrObjectProperty.valueSchema
                    : schemaOrObjectProperty;
                const property = {
                    rawKey,
                    parsedKey: parsedKey,
                    valueSchema,
                };
                rawKeyToProperty[rawKey] = property;
                if (yield isSchemaRequired(valueSchema)) {
                    requiredKeys.push(rawKey);
                }
            }
            return validateAndTransformObject({
                value: raw,
                requiredKeys,
                getProperty: (rawKey) => {
                    const property = rawKeyToProperty[rawKey];
                    if (property == null) {
                        return undefined;
                    }
                    return {
                        transformedKey: property.parsedKey,
                        transform: (propertyValue) => {
                            var _a;
                            return property.valueSchema.parse(propertyValue, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), rawKey] }));
                        },
                    };
                },
                unrecognizedObjectKeys: opts === null || opts === void 0 ? void 0 : opts.unrecognizedObjectKeys,
                skipValidation: opts === null || opts === void 0 ? void 0 : opts.skipValidation,
                breadcrumbsPrefix: opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix,
            });
        }),
        json: (parsed, opts) => __awaiter(this, void 0, void 0, function* () {
            const requiredKeys = [];
            for (const [parsedKey, schemaOrObjectProperty] of (0, entries_1.entries)(schemas)) {
                const valueSchema = (0, property_1.isProperty)(schemaOrObjectProperty)
                    ? schemaOrObjectProperty.valueSchema
                    : schemaOrObjectProperty;
                if (yield isSchemaRequired(valueSchema)) {
                    requiredKeys.push(parsedKey);
                }
            }
            return validateAndTransformObject({
                value: parsed,
                requiredKeys,
                getProperty: (parsedKey) => {
                    const property = schemas[parsedKey];
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    if (property == null) {
                        return undefined;
                    }
                    if ((0, property_1.isProperty)(property)) {
                        return {
                            transformedKey: property.rawKey,
                            transform: (propertyValue) => {
                                var _a;
                                return property.valueSchema.json(propertyValue, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), parsedKey] }));
                            },
                        };
                    }
                    else {
                        return {
                            transformedKey: parsedKey,
                            transform: (propertyValue) => {
                                var _a;
                                return property.json(propertyValue, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), parsedKey] }));
                            },
                        };
                    }
                },
                unrecognizedObjectKeys: opts === null || opts === void 0 ? void 0 : opts.unrecognizedObjectKeys,
                skipValidation: opts === null || opts === void 0 ? void 0 : opts.skipValidation,
                breadcrumbsPrefix: opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix,
            });
        }),
        getType: () => Schema_1.SchemaType.OBJECT,
    };
    return Object.assign(Object.assign(Object.assign(Object.assign({}, (0, maybeSkipValidation_1.maybeSkipValidation)(baseSchema)), (0, schema_utils_1.getSchemaUtils)(baseSchema)), (0, object_like_1.getObjectLikeUtils)(baseSchema)), getObjectUtils(baseSchema));
}
exports.object = object;
function validateAndTransformObject({ value, requiredKeys, getProperty, unrecognizedObjectKeys = "fail", skipValidation = false, breadcrumbsPrefix = [], }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, isPlainObject_1.isPlainObject)(value)) {
            return {
                ok: false,
                errors: [
                    {
                        path: breadcrumbsPrefix,
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "object"),
                    },
                ],
            };
        }
        const missingRequiredKeys = new Set(requiredKeys);
        const errors = [];
        const transformed = {};
        for (const [preTransformedKey, preTransformedItemValue] of Object.entries(value)) {
            const property = getProperty(preTransformedKey);
            if (property != null) {
                missingRequiredKeys.delete(preTransformedKey);
                const value = yield property.transform(preTransformedItemValue);
                if (value.ok) {
                    transformed[property.transformedKey] = value.value;
                }
                else {
                    transformed[preTransformedKey] = preTransformedItemValue;
                    errors.push(...value.errors);
                }
            }
            else {
                switch (unrecognizedObjectKeys) {
                    case "fail":
                        errors.push({
                            path: [...breadcrumbsPrefix, preTransformedKey],
                            message: `Unexpected key "${preTransformedKey}"`,
                        });
                        break;
                    case "strip":
                        break;
                    case "passthrough":
                        transformed[preTransformedKey] = preTransformedItemValue;
                        break;
                }
            }
        }
        errors.push(...requiredKeys
            .filter((key) => missingRequiredKeys.has(key))
            .map((key) => ({
            path: breadcrumbsPrefix,
            message: `Missing required key "${key}"`,
        })));
        if (errors.length === 0 || skipValidation) {
            return {
                ok: true,
                value: transformed,
            };
        }
        else {
            return {
                ok: false,
                errors,
            };
        }
    });
}
function getObjectUtils(schema) {
    return {
        extend: (extension) => {
            const baseSchema = {
                _getParsedProperties: () => __awaiter(this, void 0, void 0, function* () {
                    return [
                        ...(yield schema._getParsedProperties()),
                        ...(yield extension._getParsedProperties()),
                    ];
                }),
                _getRawProperties: () => __awaiter(this, void 0, void 0, function* () {
                    return [
                        ...(yield schema._getRawProperties()),
                        ...(yield extension._getRawProperties()),
                    ];
                }),
                parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
                    return validateAndTransformExtendedObject({
                        extensionKeys: yield extension._getRawProperties(),
                        value: raw,
                        transformBase: (rawBase) => schema.parse(rawBase, opts),
                        transformExtension: (rawExtension) => extension.parse(rawExtension, opts),
                    });
                }),
                json: (parsed, opts) => __awaiter(this, void 0, void 0, function* () {
                    return validateAndTransformExtendedObject({
                        extensionKeys: yield extension._getParsedProperties(),
                        value: parsed,
                        transformBase: (parsedBase) => schema.json(parsedBase, opts),
                        transformExtension: (parsedExtension) => extension.json(parsedExtension, opts),
                    });
                }),
                getType: () => Schema_1.SchemaType.OBJECT,
            };
            return Object.assign(Object.assign(Object.assign(Object.assign({}, baseSchema), (0, schema_utils_1.getSchemaUtils)(baseSchema)), (0, object_like_1.getObjectLikeUtils)(baseSchema)), getObjectUtils(baseSchema));
        },
    };
}
exports.getObjectUtils = getObjectUtils;
function validateAndTransformExtendedObject({ extensionKeys, value, transformBase, transformExtension, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const extensionPropertiesSet = new Set(extensionKeys);
        const [extensionProperties, baseProperties] = (0, partition_1.partition)((0, keys_1.keys)(value), (key) => extensionPropertiesSet.has(key));
        const transformedBase = yield transformBase((0, filterObject_1.filterObject)(value, baseProperties));
        const transformedExtension = yield transformExtension((0, filterObject_1.filterObject)(value, extensionProperties));
        if (transformedBase.ok && transformedExtension.ok) {
            return {
                ok: true,
                value: Object.assign(Object.assign({}, transformedBase.value), transformedExtension.value),
            };
        }
        else {
            return {
                ok: false,
                errors: [
                    ...(transformedBase.ok ? [] : transformedBase.errors),
                    ...(transformedExtension.ok ? [] : transformedExtension.errors),
                ],
            };
        }
    });
}
function isSchemaRequired(schema) {
    return __awaiter(this, void 0, void 0, function* () {
        return !(yield isSchemaOptional(schema));
    });
}
function isSchemaOptional(schema) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (yield schema.getType()) {
            case Schema_1.SchemaType.ANY:
            case Schema_1.SchemaType.UNKNOWN:
            case Schema_1.SchemaType.OPTIONAL:
                return true;
            default:
                return false;
        }
    });
}

},{"../../Schema":136,"../../utils/entries":178,"../../utils/filterObject":179,"../../utils/getErrorMessageForIncorrectType":180,"../../utils/isPlainObject":181,"../../utils/keys":182,"../../utils/maybeSkipValidation":183,"../../utils/partition":184,"../object-like":151,"../schema-utils":167,"./property":155}],154:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectWithoutOptionalProperties = void 0;
const object_1 = require("./object");
function objectWithoutOptionalProperties(schemas) {
    return (0, object_1.object)(schemas);
}
exports.objectWithoutOptionalProperties = objectWithoutOptionalProperties;

},{"./object":153}],155:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProperty = exports.property = void 0;
function property(rawKey, valueSchema) {
    return {
        rawKey,
        valueSchema,
        isProperty: true,
    };
}
exports.property = property;
function isProperty(maybeProperty) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return maybeProperty.isProperty;
}
exports.isProperty = isProperty;

},{}],156:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.any = void 0;
const Schema_1 = require("../../Schema");
const createIdentitySchemaCreator_1 = require("../../utils/createIdentitySchemaCreator");
exports.any = (0, createIdentitySchemaCreator_1.createIdentitySchemaCreator)(Schema_1.SchemaType.ANY, (value) => ({ ok: true, value }));

},{"../../Schema":136,"../../utils/createIdentitySchemaCreator":177}],157:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boolean = void 0;
const Schema_1 = require("../../Schema");
const createIdentitySchemaCreator_1 = require("../../utils/createIdentitySchemaCreator");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
exports.boolean = (0, createIdentitySchemaCreator_1.createIdentitySchemaCreator)(Schema_1.SchemaType.BOOLEAN, (value, { breadcrumbsPrefix = [] } = {}) => {
    if (typeof value === "boolean") {
        return {
            ok: true,
            value,
        };
    }
    else {
        return {
            ok: false,
            errors: [
                {
                    path: breadcrumbsPrefix,
                    message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "boolean"),
                },
            ],
        };
    }
});

},{"../../Schema":136,"../../utils/createIdentitySchemaCreator":177,"../../utils/getErrorMessageForIncorrectType":180}],158:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unknown = exports.string = exports.number = exports.boolean = exports.any = void 0;
var any_1 = require("./any");
Object.defineProperty(exports, "any", { enumerable: true, get: function () { return any_1.any; } });
var boolean_1 = require("./boolean");
Object.defineProperty(exports, "boolean", { enumerable: true, get: function () { return boolean_1.boolean; } });
var number_1 = require("./number");
Object.defineProperty(exports, "number", { enumerable: true, get: function () { return number_1.number; } });
var string_1 = require("./string");
Object.defineProperty(exports, "string", { enumerable: true, get: function () { return string_1.string; } });
var unknown_1 = require("./unknown");
Object.defineProperty(exports, "unknown", { enumerable: true, get: function () { return unknown_1.unknown; } });

},{"./any":156,"./boolean":157,"./number":159,"./string":160,"./unknown":161}],159:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.number = void 0;
const Schema_1 = require("../../Schema");
const createIdentitySchemaCreator_1 = require("../../utils/createIdentitySchemaCreator");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
exports.number = (0, createIdentitySchemaCreator_1.createIdentitySchemaCreator)(Schema_1.SchemaType.NUMBER, (value, { breadcrumbsPrefix = [] } = {}) => {
    if (typeof value === "number") {
        return {
            ok: true,
            value,
        };
    }
    else {
        return {
            ok: false,
            errors: [
                {
                    path: breadcrumbsPrefix,
                    message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "number"),
                },
            ],
        };
    }
});

},{"../../Schema":136,"../../utils/createIdentitySchemaCreator":177,"../../utils/getErrorMessageForIncorrectType":180}],160:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.string = void 0;
const Schema_1 = require("../../Schema");
const createIdentitySchemaCreator_1 = require("../../utils/createIdentitySchemaCreator");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
exports.string = (0, createIdentitySchemaCreator_1.createIdentitySchemaCreator)(Schema_1.SchemaType.STRING, (value, { breadcrumbsPrefix = [] } = {}) => {
    if (typeof value === "string") {
        return {
            ok: true,
            value,
        };
    }
    else {
        return {
            ok: false,
            errors: [
                {
                    path: breadcrumbsPrefix,
                    message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "string"),
                },
            ],
        };
    }
});

},{"../../Schema":136,"../../utils/createIdentitySchemaCreator":177,"../../utils/getErrorMessageForIncorrectType":180}],161:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unknown = void 0;
const Schema_1 = require("../../Schema");
const createIdentitySchemaCreator_1 = require("../../utils/createIdentitySchemaCreator");
exports.unknown = (0, createIdentitySchemaCreator_1.createIdentitySchemaCreator)(Schema_1.SchemaType.UNKNOWN, (value) => ({ ok: true, value }));

},{"../../Schema":136,"../../utils/createIdentitySchemaCreator":177}],162:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.record = void 0;
var record_1 = require("./record");
Object.defineProperty(exports, "record", { enumerable: true, get: function () { return record_1.record; } });

},{"./record":163}],163:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.record = void 0;
const Schema_1 = require("../../Schema");
const entries_1 = require("../../utils/entries");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
const isPlainObject_1 = require("../../utils/isPlainObject");
const maybeSkipValidation_1 = require("../../utils/maybeSkipValidation");
const schema_utils_1 = require("../schema-utils");
function record(keySchema, valueSchema) {
    const baseSchema = {
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
            return validateAndTransformRecord({
                value: raw,
                isKeyNumeric: (yield keySchema.getType()) === Schema_1.SchemaType.NUMBER,
                transformKey: (key) => {
                    var _a;
                    return keySchema.parse(key, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), `${key} (key)`] }));
                },
                transformValue: (value, key) => {
                    var _a;
                    return valueSchema.parse(value, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), `${key}`] }));
                },
                breadcrumbsPrefix: opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix,
            });
        }),
        json: (parsed, opts) => __awaiter(this, void 0, void 0, function* () {
            return validateAndTransformRecord({
                value: parsed,
                isKeyNumeric: (yield keySchema.getType()) === Schema_1.SchemaType.NUMBER,
                transformKey: (key) => {
                    var _a;
                    return keySchema.json(key, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), `${key} (key)`] }));
                },
                transformValue: (value, key) => {
                    var _a;
                    return valueSchema.json(value, Object.assign(Object.assign({}, opts), { breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), `${key}`] }));
                },
                breadcrumbsPrefix: opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix,
            });
        }),
        getType: () => Schema_1.SchemaType.RECORD,
    };
    return Object.assign(Object.assign({}, (0, maybeSkipValidation_1.maybeSkipValidation)(baseSchema)), (0, schema_utils_1.getSchemaUtils)(baseSchema));
}
exports.record = record;
function validateAndTransformRecord({ value, isKeyNumeric, transformKey, transformValue, breadcrumbsPrefix = [], }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, isPlainObject_1.isPlainObject)(value)) {
            return {
                ok: false,
                errors: [
                    {
                        path: breadcrumbsPrefix,
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "object"),
                    },
                ],
            };
        }
        return (0, entries_1.entries)(value).reduce((accPromise, [stringKey, value]) => __awaiter(this, void 0, void 0, function* () {
            // skip nullish keys
            if (value == null) {
                return accPromise;
            }
            const acc = yield accPromise;
            let key = stringKey;
            if (isKeyNumeric) {
                const numberKey = stringKey.length > 0 ? Number(stringKey) : NaN;
                if (!isNaN(numberKey)) {
                    key = numberKey;
                }
            }
            const transformedKey = yield transformKey(key);
            const transformedValue = yield transformValue(value, key);
            if (acc.ok && transformedKey.ok && transformedValue.ok) {
                return {
                    ok: true,
                    value: Object.assign(Object.assign({}, acc.value), { [transformedKey.value]: transformedValue.value }),
                };
            }
            const errors = [];
            if (!acc.ok) {
                errors.push(...acc.errors);
            }
            if (!transformedKey.ok) {
                errors.push(...transformedKey.errors);
            }
            if (!transformedValue.ok) {
                errors.push(...transformedValue.errors);
            }
            return {
                ok: false,
                errors,
            };
        }), Promise.resolve({ ok: true, value: {} }));
    });
}

},{"../../Schema":136,"../../utils/entries":178,"../../utils/getErrorMessageForIncorrectType":180,"../../utils/isPlainObject":181,"../../utils/maybeSkipValidation":183,"../schema-utils":167}],164:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonError = void 0;
const stringifyValidationErrors_1 = require("./stringifyValidationErrors");
class JsonError extends Error {
    constructor(errors) {
        super(errors.map(stringifyValidationErrors_1.stringifyValidationError).join("; "));
        this.errors = errors;
        Object.setPrototypeOf(this, JsonError.prototype);
    }
}
exports.JsonError = JsonError;

},{"./stringifyValidationErrors":168}],165:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseError = void 0;
const stringifyValidationErrors_1 = require("./stringifyValidationErrors");
class ParseError extends Error {
    constructor(errors) {
        super(errors.map(stringifyValidationErrors_1.stringifyValidationError).join("; "));
        this.errors = errors;
        Object.setPrototypeOf(this, ParseError.prototype);
    }
}
exports.ParseError = ParseError;

},{"./stringifyValidationErrors":168}],166:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = exports.optional = exports.getSchemaUtils = void 0;
const Schema_1 = require("../../Schema");
const JsonError_1 = require("./JsonError");
const ParseError_1 = require("./ParseError");
function getSchemaUtils(schema) {
    return {
        optional: () => optional(schema),
        transform: (transformer) => transform(schema, transformer),
        parseOrThrow: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
            const parsed = yield schema.parse(raw, opts);
            if (parsed.ok) {
                return parsed.value;
            }
            throw new ParseError_1.ParseError(parsed.errors);
        }),
        jsonOrThrow: (parsed, opts) => __awaiter(this, void 0, void 0, function* () {
            const raw = yield schema.json(parsed, opts);
            if (raw.ok) {
                return raw.value;
            }
            throw new JsonError_1.JsonError(raw.errors);
        }),
    };
}
exports.getSchemaUtils = getSchemaUtils;
/**
 * schema utils are defined in one file to resolve issues with circular imports
 */
function optional(schema) {
    const baseSchema = {
        parse: (raw, opts) => {
            if (raw == null) {
                return {
                    ok: true,
                    value: undefined,
                };
            }
            return schema.parse(raw, opts);
        },
        json: (parsed, opts) => {
            if (parsed == null) {
                return {
                    ok: true,
                    value: null,
                };
            }
            return schema.json(parsed, opts);
        },
        getType: () => Schema_1.SchemaType.OPTIONAL,
    };
    return Object.assign(Object.assign({}, baseSchema), getSchemaUtils(baseSchema));
}
exports.optional = optional;
function transform(schema, transformer) {
    const baseSchema = {
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
            const parsed = yield schema.parse(raw, opts);
            if (!parsed.ok) {
                return parsed;
            }
            return {
                ok: true,
                value: transformer.transform(parsed.value),
            };
        }),
        json: (transformed, opts) => __awaiter(this, void 0, void 0, function* () {
            const parsed = yield transformer.untransform(transformed);
            return schema.json(parsed, opts);
        }),
        getType: () => schema.getType(),
    };
    return Object.assign(Object.assign({}, baseSchema), getSchemaUtils(baseSchema));
}
exports.transform = transform;

},{"../../Schema":136,"./JsonError":164,"./ParseError":165}],167:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseError = exports.JsonError = exports.transform = exports.optional = exports.getSchemaUtils = void 0;
var getSchemaUtils_1 = require("./getSchemaUtils");
Object.defineProperty(exports, "getSchemaUtils", { enumerable: true, get: function () { return getSchemaUtils_1.getSchemaUtils; } });
Object.defineProperty(exports, "optional", { enumerable: true, get: function () { return getSchemaUtils_1.optional; } });
Object.defineProperty(exports, "transform", { enumerable: true, get: function () { return getSchemaUtils_1.transform; } });
var JsonError_1 = require("./JsonError");
Object.defineProperty(exports, "JsonError", { enumerable: true, get: function () { return JsonError_1.JsonError; } });
var ParseError_1 = require("./ParseError");
Object.defineProperty(exports, "ParseError", { enumerable: true, get: function () { return ParseError_1.ParseError; } });

},{"./JsonError":164,"./ParseError":165,"./getSchemaUtils":166}],168:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyValidationError = void 0;
function stringifyValidationError(error) {
    if (error.path.length === 0) {
        return error.message;
    }
    return `${error.path.join(" -> ")}: ${error.message}`;
}
exports.stringifyValidationError = stringifyValidationError;

},{}],169:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.set = void 0;
var set_1 = require("./set");
Object.defineProperty(exports, "set", { enumerable: true, get: function () { return set_1.set; } });

},{"./set":170}],170:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.set = void 0;
const Schema_1 = require("../../Schema");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
const maybeSkipValidation_1 = require("../../utils/maybeSkipValidation");
const list_1 = require("../list");
const schema_utils_1 = require("../schema-utils");
function set(schema) {
    const listSchema = (0, list_1.list)(schema);
    const baseSchema = {
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
            const parsedList = yield listSchema.parse(raw, opts);
            if (parsedList.ok) {
                return {
                    ok: true,
                    value: new Set(parsedList.value),
                };
            }
            else {
                return parsedList;
            }
        }),
        json: (parsed, opts) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!(parsed instanceof Set)) {
                return {
                    ok: false,
                    errors: [
                        {
                            path: (_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : [],
                            message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(parsed, "Set"),
                        },
                    ],
                };
            }
            const jsonList = yield listSchema.json([...parsed], opts);
            return jsonList;
        }),
        getType: () => Schema_1.SchemaType.SET,
    };
    return Object.assign(Object.assign({}, (0, maybeSkipValidation_1.maybeSkipValidation)(baseSchema)), (0, schema_utils_1.getSchemaUtils)(baseSchema));
}
exports.set = set;

},{"../../Schema":136,"../../utils/getErrorMessageForIncorrectType":180,"../../utils/maybeSkipValidation":183,"../list":145,"../schema-utils":167}],171:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.undiscriminatedUnion = void 0;
var undiscriminatedUnion_1 = require("./undiscriminatedUnion");
Object.defineProperty(exports, "undiscriminatedUnion", { enumerable: true, get: function () { return undiscriminatedUnion_1.undiscriminatedUnion; } });

},{"./undiscriminatedUnion":172}],172:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.undiscriminatedUnion = void 0;
const Schema_1 = require("../../Schema");
const maybeSkipValidation_1 = require("../../utils/maybeSkipValidation");
const schema_utils_1 = require("../schema-utils");
function undiscriminatedUnion(schemas) {
    const baseSchema = {
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
            return validateAndTransformUndiscriminatedUnion((schema, opts) => schema.parse(raw, opts), schemas, opts);
        }),
        json: (parsed, opts) => __awaiter(this, void 0, void 0, function* () {
            return validateAndTransformUndiscriminatedUnion((schema, opts) => schema.json(parsed, opts), schemas, opts);
        }),
        getType: () => Schema_1.SchemaType.UNDISCRIMINATED_UNION,
    };
    return Object.assign(Object.assign({}, (0, maybeSkipValidation_1.maybeSkipValidation)(baseSchema)), (0, schema_utils_1.getSchemaUtils)(baseSchema));
}
exports.undiscriminatedUnion = undiscriminatedUnion;
function validateAndTransformUndiscriminatedUnion(transform, schemas, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const errors = [];
        for (const [index, schema] of schemas.entries()) {
            const transformed = yield transform(schema, Object.assign(Object.assign({}, opts), { skipValidation: false }));
            if (transformed.ok) {
                return transformed;
            }
            else {
                for (const error of transformed.errors) {
                    errors.push({
                        path: error.path,
                        message: `[Variant ${index}] ${error.message}`,
                    });
                }
            }
        }
        return {
            ok: false,
            errors,
        };
    });
}

},{"../../Schema":136,"../../utils/maybeSkipValidation":183,"../schema-utils":167}],173:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discriminant = void 0;
function discriminant(parsedDiscriminant, rawDiscriminant) {
    return {
        parsedDiscriminant,
        rawDiscriminant,
    };
}
exports.discriminant = discriminant;

},{}],174:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.union = exports.discriminant = void 0;
var discriminant_1 = require("./discriminant");
Object.defineProperty(exports, "discriminant", { enumerable: true, get: function () { return discriminant_1.discriminant; } });
var union_1 = require("./union");
Object.defineProperty(exports, "union", { enumerable: true, get: function () { return union_1.union; } });

},{"./discriminant":173,"./union":175}],175:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.union = void 0;
const Schema_1 = require("../../Schema");
const getErrorMessageForIncorrectType_1 = require("../../utils/getErrorMessageForIncorrectType");
const isPlainObject_1 = require("../../utils/isPlainObject");
const keys_1 = require("../../utils/keys");
const maybeSkipValidation_1 = require("../../utils/maybeSkipValidation");
const enum_1 = require("../enum");
const object_like_1 = require("../object-like");
const schema_utils_1 = require("../schema-utils");
function union(discriminant, union) {
    const rawDiscriminant = typeof discriminant === "string" ? discriminant : discriminant.rawDiscriminant;
    const parsedDiscriminant = typeof discriminant === "string"
        ? discriminant
        : discriminant.parsedDiscriminant;
    const discriminantValueSchema = (0, enum_1.enum_)((0, keys_1.keys)(union));
    const baseSchema = {
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
            return transformAndValidateUnion({
                value: raw,
                discriminant: rawDiscriminant,
                transformedDiscriminant: parsedDiscriminant,
                transformDiscriminantValue: (discriminantValue) => {
                    var _a;
                    return discriminantValueSchema.parse(discriminantValue, {
                        allowUnrecognizedEnumValues: opts === null || opts === void 0 ? void 0 : opts.allowUnrecognizedUnionMembers,
                        breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), rawDiscriminant],
                    });
                },
                getAdditionalPropertiesSchema: (discriminantValue) => union[discriminantValue],
                allowUnrecognizedUnionMembers: opts === null || opts === void 0 ? void 0 : opts.allowUnrecognizedUnionMembers,
                transformAdditionalProperties: (additionalProperties, additionalPropertiesSchema) => additionalPropertiesSchema.parse(additionalProperties, opts),
                breadcrumbsPrefix: opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix,
            });
        }),
        json: (parsed, opts) => __awaiter(this, void 0, void 0, function* () {
            return transformAndValidateUnion({
                value: parsed,
                discriminant: parsedDiscriminant,
                transformedDiscriminant: rawDiscriminant,
                transformDiscriminantValue: (discriminantValue) => {
                    var _a;
                    return discriminantValueSchema.json(discriminantValue, {
                        allowUnrecognizedEnumValues: opts === null || opts === void 0 ? void 0 : opts.allowUnrecognizedUnionMembers,
                        breadcrumbsPrefix: [...((_a = opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix) !== null && _a !== void 0 ? _a : []), parsedDiscriminant],
                    });
                },
                getAdditionalPropertiesSchema: (discriminantValue) => union[discriminantValue],
                allowUnrecognizedUnionMembers: opts === null || opts === void 0 ? void 0 : opts.allowUnrecognizedUnionMembers,
                transformAdditionalProperties: (additionalProperties, additionalPropertiesSchema) => additionalPropertiesSchema.json(additionalProperties, opts),
                breadcrumbsPrefix: opts === null || opts === void 0 ? void 0 : opts.breadcrumbsPrefix,
            });
        }),
        getType: () => Schema_1.SchemaType.UNION,
    };
    return Object.assign(Object.assign(Object.assign({}, (0, maybeSkipValidation_1.maybeSkipValidation)(baseSchema)), (0, schema_utils_1.getSchemaUtils)(baseSchema)), (0, object_like_1.getObjectLikeUtils)(baseSchema));
}
exports.union = union;
function transformAndValidateUnion({ value, discriminant, transformedDiscriminant, transformDiscriminantValue, getAdditionalPropertiesSchema, allowUnrecognizedUnionMembers = false, transformAdditionalProperties, breadcrumbsPrefix = [], }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, isPlainObject_1.isPlainObject)(value)) {
            return {
                ok: false,
                errors: [
                    {
                        path: breadcrumbsPrefix,
                        message: (0, getErrorMessageForIncorrectType_1.getErrorMessageForIncorrectType)(value, "object"),
                    },
                ],
            };
        }
        const _a = value, _b = discriminant, discriminantValue = _a[_b], additionalProperties = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
        if (discriminantValue == null) {
            return {
                ok: false,
                errors: [
                    {
                        path: breadcrumbsPrefix,
                        message: `Missing discriminant ("${discriminant}")`,
                    },
                ],
            };
        }
        const transformedDiscriminantValue = yield transformDiscriminantValue(discriminantValue);
        if (!transformedDiscriminantValue.ok) {
            return {
                ok: false,
                errors: transformedDiscriminantValue.errors,
            };
        }
        const additionalPropertiesSchema = getAdditionalPropertiesSchema(transformedDiscriminantValue.value);
        if (additionalPropertiesSchema == null) {
            if (allowUnrecognizedUnionMembers) {
                return {
                    ok: true,
                    value: Object.assign({ [transformedDiscriminant]: transformedDiscriminantValue.value }, additionalProperties),
                };
            }
            else {
                return {
                    ok: false,
                    errors: [
                        {
                            path: [...breadcrumbsPrefix, discriminant],
                            message: "Unexpected discriminant value",
                        },
                    ],
                };
            }
        }
        const transformedAdditionalProperties = yield transformAdditionalProperties(additionalProperties, additionalPropertiesSchema);
        if (!transformedAdditionalProperties.ok) {
            return transformedAdditionalProperties;
        }
        return {
            ok: true,
            value: Object.assign({ [transformedDiscriminant]: discriminantValue }, transformedAdditionalProperties.value),
        };
    });
}

},{"../../Schema":136,"../../utils/getErrorMessageForIncorrectType":180,"../../utils/isPlainObject":181,"../../utils/keys":182,"../../utils/maybeSkipValidation":183,"../enum":140,"../object-like":151,"../schema-utils":167}],176:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./builders"), exports);

},{"./builders":141}],177:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIdentitySchemaCreator = void 0;
const schema_utils_1 = require("../builders/schema-utils");
const maybeSkipValidation_1 = require("./maybeSkipValidation");
function createIdentitySchemaCreator(schemaType, validate) {
    return () => {
        const baseSchema = {
            parse: validate,
            json: validate,
            getType: () => schemaType,
        };
        return Object.assign(Object.assign({}, (0, maybeSkipValidation_1.maybeSkipValidation)(baseSchema)), (0, schema_utils_1.getSchemaUtils)(baseSchema));
    };
}
exports.createIdentitySchemaCreator = createIdentitySchemaCreator;

},{"../builders/schema-utils":167,"./maybeSkipValidation":183}],178:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entries = void 0;
function entries(object) {
    return Object.entries(object);
}
exports.entries = entries;

},{}],179:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterObject = void 0;
function filterObject(obj, keysToInclude) {
    const keysToIncludeSet = new Set(keysToInclude);
    return Object.entries(obj).reduce((acc, [key, value]) => {
        if (keysToIncludeSet.has(key)) {
            acc[key] = value;
        }
        return acc;
        // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter
    }, {});
}
exports.filterObject = filterObject;

},{}],180:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessageForIncorrectType = void 0;
function getErrorMessageForIncorrectType(value, expectedType) {
    return `Expected ${expectedType}. Received ${getTypeAsString(value)}.`;
}
exports.getErrorMessageForIncorrectType = getErrorMessageForIncorrectType;
function getTypeAsString(value) {
    if (Array.isArray(value)) {
        return "list";
    }
    if (value === null) {
        return "null";
    }
    switch (typeof value) {
        case "string":
            return `"${value}"`;
        case "number":
        case "boolean":
        case "undefined":
            return `${value}`;
    }
    return typeof value;
}

},{}],181:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlainObject = void 0;
// borrowed from https://github.com/lodash/lodash/blob/master/isPlainObject.js
function isPlainObject(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    if (Object.getPrototypeOf(value) === null) {
        return true;
    }
    let proto = value;
    while (Object.getPrototypeOf(proto) !== null) {
        proto = Object.getPrototypeOf(proto);
    }
    return Object.getPrototypeOf(value) === proto;
}
exports.isPlainObject = isPlainObject;

},{}],182:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keys = void 0;
function keys(object) {
    return Object.keys(object);
}
exports.keys = keys;

},{}],183:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeSkipValidation = void 0;
function maybeSkipValidation(schema) {
    return Object.assign(Object.assign({}, schema), { json: transformAndMaybeSkipValidation(schema.json), parse: transformAndMaybeSkipValidation(schema.parse) });
}
exports.maybeSkipValidation = maybeSkipValidation;
function transformAndMaybeSkipValidation(transform) {
    return (value, opts) => __awaiter(this, void 0, void 0, function* () {
        const transformed = yield transform(value, opts);
        const { skipValidation = false } = opts !== null && opts !== void 0 ? opts : {};
        if (!transformed.ok && skipValidation) {
            // eslint-disable-next-line no-console
            console.warn([
                "Failed to validate.",
                ...transformed.errors.map((error) => "  - " +
                    (error.path.length > 0 ? `${error.path.join(".")}: ${error.message}` : error.message)),
            ].join("\n"));
            return {
                ok: true,
                value: value,
            };
        }
        else {
            return transformed;
        }
    });
}

},{}],184:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partition = void 0;
function partition(items, predicate) {
    const trueItems = [], falseItems = [];
    for (const item of items) {
        if (predicate(item)) {
            trueItems.push(item);
        }
        else {
            falseItems.push(item);
        }
    }
    return [trueItems, falseItems];
}
exports.partition = partition;

},{}],185:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stream = void 0;
class Stream {
    constructor({ stream, parse, terminator, }) {
        this.stream = stream;
        this.parse = parse;
        this.terminator = terminator;
    }
    iterMessages() {
        return __asyncGenerator(this, arguments, function* iterMessages_1() {
            var e_1, _a;
            let previous = "";
            try {
                for (var _b = __asyncValues(this.stream), _c; _c = yield __await(_b.next()), !_c.done;) {
                    const chunk = _c.value;
                    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                    previous += bufferChunk;
                    let terminatorIndex;
                    while ((terminatorIndex = previous.indexOf(this.terminator)) >= 0) {
                        const line = previous.slice(0, terminatorIndex).trimEnd();
                        const message = yield __await(this.parse(JSON.parse(line)));
                        yield yield __await(message);
                        previous = previous.slice(terminatorIndex + 1);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield __await(_a.call(_b));
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
    }
    [Symbol.asyncIterator]() {
        return __asyncGenerator(this, arguments, function* _a() {
            var e_2, _b;
            try {
                for (var _c = __asyncValues(this.iterMessages()), _d; _d = yield __await(_c.next()), !_d.done;) {
                    const message = _d.value;
                    yield yield __await(message);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_b = _c.return)) yield __await(_b.call(_c));
                }
                finally { if (e_2) throw e_2.error; }
            }
        });
    }
}
exports.Stream = Stream;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":3}],186:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stream = void 0;
var Stream_1 = require("./Stream");
Object.defineProperty(exports, "Stream", { enumerable: true, get: function () { return Stream_1.Stream; } });

},{"./Stream":185}],187:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohereEnvironment = void 0;
exports.CohereEnvironment = {
    Production: "https://api.cohere.ai/v1",
};

},{}],188:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohereError = void 0;
class CohereError extends Error {
    constructor({ message, statusCode, body }) {
        super(buildMessage({ message, statusCode, body }));
        Object.setPrototypeOf(this, CohereError.prototype);
        if (statusCode != null) {
            this.statusCode = statusCode;
        }
        if (body !== undefined) {
            this.body = body;
        }
    }
}
exports.CohereError = CohereError;
function buildMessage({ message, statusCode, body, }) {
    let lines = [];
    if (message != null) {
        lines.push(message);
    }
    if (statusCode != null) {
        lines.push(`Status code: ${statusCode.toString()}`);
    }
    if (body != null) {
        lines.push(`Body: ${JSON.stringify(body, undefined, 2)}`);
    }
    return lines.join("\n");
}

},{}],189:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohereTimeoutError = void 0;
class CohereTimeoutError extends Error {
    constructor() {
        super("Timeout");
        Object.setPrototypeOf(this, CohereTimeoutError.prototype);
    }
}
exports.CohereTimeoutError = CohereTimeoutError;

},{}],190:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohereTimeoutError = exports.CohereError = void 0;
var CohereError_1 = require("./CohereError");
Object.defineProperty(exports, "CohereError", { enumerable: true, get: function () { return CohereError_1.CohereError; } });
var CohereTimeoutError_1 = require("./CohereTimeoutError");
Object.defineProperty(exports, "CohereTimeoutError", { enumerable: true, get: function () { return CohereTimeoutError_1.CohereTimeoutError; } });

},{"./CohereError":188,"./CohereTimeoutError":189}],191:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohereTimeoutError = exports.CohereError = exports.CohereEnvironment = exports.CohereClient = exports.Cohere = void 0;
exports.Cohere = __importStar(require("./api"));
var Client_1 = require("./Client");
Object.defineProperty(exports, "CohereClient", { enumerable: true, get: function () { return Client_1.CohereClient; } });
var environments_1 = require("./environments");
Object.defineProperty(exports, "CohereEnvironment", { enumerable: true, get: function () { return environments_1.CohereEnvironment; } });
var errors_1 = require("./errors");
Object.defineProperty(exports, "CohereError", { enumerable: true, get: function () { return errors_1.CohereError; } });
Object.defineProperty(exports, "CohereTimeoutError", { enumerable: true, get: function () { return errors_1.CohereTimeoutError; } });

},{"./Client":11,"./api":19,"./environments":187,"./errors":190}],192:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./requests":204,"dup":12}],193:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRequest = void 0;
const core = __importStar(require("../../../core"));
exports.ChatRequest = core.serialization.object({
    message: core.serialization.string(),
    model: core.serialization.string().optional(),
    preambleOverride: core.serialization.property("preamble_override", core.serialization.string().optional()),
    chatHistory: core.serialization.property("chat_history", core.serialization
        .list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).ChatMessage; })))
        .optional()),
    conversationId: core.serialization.property("conversation_id", core.serialization.string().optional()),
    promptTruncation: core.serialization.property("prompt_truncation", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).ChatRequestPromptTruncation; })).optional()),
    connectors: core.serialization
        .list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).ChatConnector; })))
        .optional(),
    searchQueriesOnly: core.serialization.property("search_queries_only", core.serialization.boolean().optional()),
    documents: core.serialization
        .list(core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).ChatDocument; })))
        .optional(),
    citationQuality: core.serialization.property("citation_quality", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).ChatRequestCitationQuality; })).optional()),
    temperature: core.serialization.number().optional(),
});

},{"../..":205,"../../../core":135}],194:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStreamRequest = void 0;
const core = __importStar(require("../../../core"));
exports.ChatStreamRequest = core.serialization.object({
    message: core.serialization.string(),
    model: core.serialization.string().optional(),
    preambleOverride: core.serialization.property("preamble_override", core.serialization.string().optional()),
    chatHistory: core.serialization.property("chat_history", core.serialization
        .list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).ChatMessage; })))
        .optional()),
    conversationId: core.serialization.property("conversation_id", core.serialization.string().optional()),
    promptTruncation: core.serialization.property("prompt_truncation", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).ChatStreamRequestPromptTruncation; })).optional()),
    connectors: core.serialization
        .list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).ChatConnector; })))
        .optional(),
    searchQueriesOnly: core.serialization.property("search_queries_only", core.serialization.boolean().optional()),
    documents: core.serialization
        .list(core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).ChatDocument; })))
        .optional(),
    citationQuality: core.serialization.property("citation_quality", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).ChatStreamRequestCitationQuality; })).optional()),
    temperature: core.serialization.number().optional(),
});

},{"../..":205,"../../../core":135}],195:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassifyRequest = void 0;
const core = __importStar(require("../../../core"));
exports.ClassifyRequest = core.serialization.object({
    inputs: core.serialization.list(core.serialization.string()),
    examples: core.serialization.list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).ClassifyRequestExamplesItem; }))),
    model: core.serialization.string().optional(),
    preset: core.serialization.string().optional(),
    truncate: core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).ClassifyRequestTruncate; })).optional(),
});

},{"../..":205,"../../../core":135}],196:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectLanguageRequest = void 0;
const core = __importStar(require("../../../core"));
exports.DetectLanguageRequest = core.serialization.object({
    texts: core.serialization.list(core.serialization.string()),
    model: core.serialization.string().optional(),
});

},{"../../../core":135}],197:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetokenizeRequest = void 0;
const core = __importStar(require("../../../core"));
exports.DetokenizeRequest = core.serialization.object({
    tokens: core.serialization.list(core.serialization.number()),
    model: core.serialization.string().optional(),
});

},{"../../../core":135}],198:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedRequest = void 0;
const core = __importStar(require("../../../core"));
exports.EmbedRequest = core.serialization.object({
    texts: core.serialization.list(core.serialization.string()),
    model: core.serialization.string().optional(),
    inputType: core.serialization.property("input_type", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).EmbedInputType; })).optional()),
    embeddingTypes: core.serialization.property("embedding_types", core.serialization.list(core.serialization.string()).optional()),
    truncate: core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).EmbedRequestTruncate; })).optional(),
});

},{"../..":205,"../../../core":135}],199:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateRequest = void 0;
const core = __importStar(require("../../../core"));
exports.GenerateRequest = core.serialization.object({
    prompt: core.serialization.string(),
    model: core.serialization.string().optional(),
    numGenerations: core.serialization.property("num_generations", core.serialization.number().optional()),
    maxTokens: core.serialization.property("max_tokens", core.serialization.number().optional()),
    truncate: core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).GenerateRequestTruncate; })).optional(),
    temperature: core.serialization.number().optional(),
    preset: core.serialization.string().optional(),
    endSequences: core.serialization.property("end_sequences", core.serialization.list(core.serialization.string()).optional()),
    stopSequences: core.serialization.property("stop_sequences", core.serialization.list(core.serialization.string()).optional()),
    k: core.serialization.number().optional(),
    p: core.serialization.number().optional(),
    frequencyPenalty: core.serialization.property("frequency_penalty", core.serialization.number().optional()),
    presencePenalty: core.serialization.property("presence_penalty", core.serialization.number().optional()),
    returnLikelihoods: core.serialization.property("return_likelihoods", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).GenerateRequestReturnLikelihoods; })).optional()),
    logitBias: core.serialization.property("logit_bias", core.serialization.record(core.serialization.string(), core.serialization.number()).optional()),
});

},{"../..":205,"../../../core":135}],200:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateStreamRequest = void 0;
const core = __importStar(require("../../../core"));
exports.GenerateStreamRequest = core.serialization.object({
    prompt: core.serialization.string(),
    model: core.serialization.string().optional(),
    numGenerations: core.serialization.property("num_generations", core.serialization.number().optional()),
    maxTokens: core.serialization.property("max_tokens", core.serialization.number().optional()),
    truncate: core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).GenerateStreamRequestTruncate; })).optional(),
    temperature: core.serialization.number().optional(),
    preset: core.serialization.string().optional(),
    endSequences: core.serialization.property("end_sequences", core.serialization.list(core.serialization.string()).optional()),
    stopSequences: core.serialization.property("stop_sequences", core.serialization.list(core.serialization.string()).optional()),
    k: core.serialization.number().optional(),
    p: core.serialization.number().optional(),
    frequencyPenalty: core.serialization.property("frequency_penalty", core.serialization.number().optional()),
    presencePenalty: core.serialization.property("presence_penalty", core.serialization.number().optional()),
    returnLikelihoods: core.serialization.property("return_likelihoods", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).GenerateStreamRequestReturnLikelihoods; })).optional()),
    logitBias: core.serialization.property("logit_bias", core.serialization.record(core.serialization.string(), core.serialization.number()).optional()),
});

},{"../..":205,"../../../core":135}],201:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RerankRequest = void 0;
const core = __importStar(require("../../../core"));
exports.RerankRequest = core.serialization.object({
    model: core.serialization.string().optional(),
    query: core.serialization.string(),
    documents: core.serialization.list(core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).RerankRequestDocumentsItem; }))),
    topN: core.serialization.property("top_n", core.serialization.number().optional()),
    returnDocuments: core.serialization.property("return_documents", core.serialization.boolean().optional()),
    maxChunksPerDoc: core.serialization.property("max_chunks_per_doc", core.serialization.number().optional()),
});

},{"../..":205,"../../../core":135}],202:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizeRequest = void 0;
const core = __importStar(require("../../../core"));
exports.SummarizeRequest = core.serialization.object({
    text: core.serialization.string(),
    length: core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).SummarizeRequestLength; })).optional(),
    format: core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).SummarizeRequestFormat; })).optional(),
    model: core.serialization.string().optional(),
    extractiveness: core.serialization
        .lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../..")))).SummarizeRequestExtractiveness; }))
        .optional(),
    temperature: core.serialization.number().optional(),
    additionalCommand: core.serialization.property("additional_command", core.serialization.string().optional()),
});

},{"../..":205,"../../../core":135}],203:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenizeRequest = void 0;
const core = __importStar(require("../../../core"));
exports.TokenizeRequest = core.serialization.object({
    text: core.serialization.string(),
    model: core.serialization.string().optional(),
});

},{"../../../core":135}],204:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetokenizeRequest = exports.TokenizeRequest = exports.SummarizeRequest = exports.DetectLanguageRequest = exports.ClassifyRequest = exports.RerankRequest = exports.EmbedRequest = exports.GenerateRequest = exports.GenerateStreamRequest = exports.ChatRequest = exports.ChatStreamRequest = void 0;
var ChatStreamRequest_1 = require("./ChatStreamRequest");
Object.defineProperty(exports, "ChatStreamRequest", { enumerable: true, get: function () { return ChatStreamRequest_1.ChatStreamRequest; } });
var ChatRequest_1 = require("./ChatRequest");
Object.defineProperty(exports, "ChatRequest", { enumerable: true, get: function () { return ChatRequest_1.ChatRequest; } });
var GenerateStreamRequest_1 = require("./GenerateStreamRequest");
Object.defineProperty(exports, "GenerateStreamRequest", { enumerable: true, get: function () { return GenerateStreamRequest_1.GenerateStreamRequest; } });
var GenerateRequest_1 = require("./GenerateRequest");
Object.defineProperty(exports, "GenerateRequest", { enumerable: true, get: function () { return GenerateRequest_1.GenerateRequest; } });
var EmbedRequest_1 = require("./EmbedRequest");
Object.defineProperty(exports, "EmbedRequest", { enumerable: true, get: function () { return EmbedRequest_1.EmbedRequest; } });
var RerankRequest_1 = require("./RerankRequest");
Object.defineProperty(exports, "RerankRequest", { enumerable: true, get: function () { return RerankRequest_1.RerankRequest; } });
var ClassifyRequest_1 = require("./ClassifyRequest");
Object.defineProperty(exports, "ClassifyRequest", { enumerable: true, get: function () { return ClassifyRequest_1.ClassifyRequest; } });
var DetectLanguageRequest_1 = require("./DetectLanguageRequest");
Object.defineProperty(exports, "DetectLanguageRequest", { enumerable: true, get: function () { return DetectLanguageRequest_1.DetectLanguageRequest; } });
var SummarizeRequest_1 = require("./SummarizeRequest");
Object.defineProperty(exports, "SummarizeRequest", { enumerable: true, get: function () { return SummarizeRequest_1.SummarizeRequest; } });
var TokenizeRequest_1 = require("./TokenizeRequest");
Object.defineProperty(exports, "TokenizeRequest", { enumerable: true, get: function () { return TokenizeRequest_1.TokenizeRequest; } });
var DetokenizeRequest_1 = require("./DetokenizeRequest");
Object.defineProperty(exports, "DetokenizeRequest", { enumerable: true, get: function () { return DetokenizeRequest_1.DetokenizeRequest; } });

},{"./ChatRequest":193,"./ChatStreamRequest":194,"./ClassifyRequest":195,"./DetectLanguageRequest":196,"./DetokenizeRequest":197,"./EmbedRequest":198,"./GenerateRequest":199,"./GenerateStreamRequest":200,"./RerankRequest":201,"./SummarizeRequest":202,"./TokenizeRequest":203}],205:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./resources"), exports);
__exportStar(require("./types"), exports);
__exportStar(require("./client"), exports);

},{"./client":192,"./resources":225,"./types":313}],206:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./requests":209,"dup":12}],207:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateConnectorRequest = void 0;
const core = __importStar(require("../../../../../core"));
exports.CreateConnectorRequest = core.serialization.object({
    name: core.serialization.string(),
    description: core.serialization.string().optional(),
    url: core.serialization.string(),
    excludes: core.serialization.list(core.serialization.string()).optional(),
    oauth: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../../../..")))).CreateConnectorOAuth; })).optional(),
    active: core.serialization.boolean().optional(),
    continueOnFailure: core.serialization.property("continue_on_failure", core.serialization.boolean().optional()),
    serviceAuth: core.serialization.property("service_auth", core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../../../..")))).CreateConnectorServiceAuth; })).optional()),
});

},{"../../../..":205,"../../../../../core":135}],208:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateConnectorRequest = void 0;
const core = __importStar(require("../../../../../core"));
exports.UpdateConnectorRequest = core.serialization.object({
    name: core.serialization.string().optional(),
    url: core.serialization.string().optional(),
    excludes: core.serialization.list(core.serialization.string()).optional(),
    oauth: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../../../..")))).CreateConnectorOAuth; })).optional(),
    active: core.serialization.boolean().optional(),
    continueOnFailure: core.serialization.property("continue_on_failure", core.serialization.boolean().optional()),
    serviceAuth: core.serialization.property("service_auth", core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../../../..")))).CreateConnectorServiceAuth; })).optional()),
});

},{"../../../..":205,"../../../../../core":135}],209:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateConnectorRequest = exports.CreateConnectorRequest = void 0;
var CreateConnectorRequest_1 = require("./CreateConnectorRequest");
Object.defineProperty(exports, "CreateConnectorRequest", { enumerable: true, get: function () { return CreateConnectorRequest_1.CreateConnectorRequest; } });
var UpdateConnectorRequest_1 = require("./UpdateConnectorRequest");
Object.defineProperty(exports, "UpdateConnectorRequest", { enumerable: true, get: function () { return UpdateConnectorRequest_1.UpdateConnectorRequest; } });

},{"./CreateConnectorRequest":207,"./UpdateConnectorRequest":208}],210:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"./client":206,"dup":23}],211:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Response = void 0;
const core = __importStar(require("../../../../core"));
exports.Response = core.serialization.record(core.serialization.string(), core.serialization.unknown());

},{"../../../../core":135}],212:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delete = void 0;
exports.delete = __importStar(require("./delete"));

},{"./delete":211}],213:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"./client":212,"./types":218,"dup":27}],214:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetsCreateResponse = void 0;
const core = __importStar(require("../../../../core"));
exports.DatasetsCreateResponse = core.serialization.object({
    id: core.serialization.string().optional(),
});

},{"../../../../core":135}],215:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetsGetResponse = void 0;
const core = __importStar(require("../../../../core"));
exports.DatasetsGetResponse = core.serialization.object({
    dataset: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../../..")))).Dataset; })).optional(),
});

},{"../../..":205,"../../../../core":135}],216:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetsGetUsageResponse = void 0;
const core = __importStar(require("../../../../core"));
exports.DatasetsGetUsageResponse = core.serialization.object({
    organizationUsage: core.serialization.property("organization_usage", core.serialization.string().optional()),
});

},{"../../../../core":135}],217:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetsListResponse = void 0;
const core = __importStar(require("../../../../core"));
exports.DatasetsListResponse = core.serialization.object({
    datasets: core.serialization
        .list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../../..")))).Dataset; })))
        .optional(),
});

},{"../../..":205,"../../../../core":135}],218:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"./DatasetsCreateResponse":214,"./DatasetsGetResponse":215,"./DatasetsGetUsageResponse":216,"./DatasetsListResponse":217,"dup":32}],219:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./requests":221,"dup":12}],220:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEmbedJobRequest = void 0;
const core = __importStar(require("../../../../../core"));
exports.CreateEmbedJobRequest = core.serialization.object({
    model: core.serialization.string(),
    datasetId: core.serialization.property("dataset_id", core.serialization.string()),
    inputType: core.serialization.property("input_type", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../../../..")))).EmbedInputType; }))),
    name: core.serialization.string().optional(),
    truncate: core.serialization
        .lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("../../../..")))).CreateEmbedJobRequestTruncate; }))
        .optional(),
});

},{"../../../..":205,"../../../../../core":135}],221:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEmbedJobRequest = void 0;
var CreateEmbedJobRequest_1 = require("./CreateEmbedJobRequest");
Object.defineProperty(exports, "CreateEmbedJobRequest", { enumerable: true, get: function () { return CreateEmbedJobRequest_1.CreateEmbedJobRequest; } });

},{"./CreateEmbedJobRequest":220}],222:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"./client":219,"./types":224,"dup":27}],223:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEmbedJobRequestTruncate = void 0;
const core = __importStar(require("../../../../core"));
exports.CreateEmbedJobRequestTruncate = core.serialization.enum_(["START", "END"]);

},{"../../../../core":135}],224:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"./CreateEmbedJobRequestTruncate":223,"dup":38}],225:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectors = exports.datasets = exports.embedJobs = void 0;
exports.embedJobs = __importStar(require("./embedJobs"));
__exportStar(require("./embedJobs/types"), exports);
exports.datasets = __importStar(require("./datasets"));
__exportStar(require("./datasets/types"), exports);
__exportStar(require("./embedJobs/client/requests"), exports);
exports.connectors = __importStar(require("./connectors"));
__exportStar(require("./connectors/client/requests"), exports);

},{"./connectors":210,"./connectors/client/requests":209,"./datasets":213,"./datasets/types":218,"./embedJobs":222,"./embedJobs/client/requests":221,"./embedJobs/types":224}],226:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiMeta = void 0;
const core = __importStar(require("../../core"));
exports.ApiMeta = core.serialization.object({
    apiVersion: core.serialization.property("api_version", core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMetaApiVersion; })).optional()),
    billedUnits: core.serialization.property("billed_units", core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMetaBilledUnits; })).optional()),
    warnings: core.serialization.list(core.serialization.string()).optional(),
});

},{"..":205,"../../core":135}],227:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiMetaApiVersion = void 0;
const core = __importStar(require("../../core"));
exports.ApiMetaApiVersion = core.serialization.object({
    version: core.serialization.string(),
    isDeprecated: core.serialization.property("is_deprecated", core.serialization.boolean().optional()),
    isExperimental: core.serialization.property("is_experimental", core.serialization.boolean().optional()),
});

},{"../../core":135}],228:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiMetaBilledUnits = void 0;
const core = __importStar(require("../../core"));
exports.ApiMetaBilledUnits = core.serialization.object({
    inputTokens: core.serialization.property("input_tokens", core.serialization.number().optional()),
    outputTokens: core.serialization.property("output_tokens", core.serialization.number().optional()),
    searchUnits: core.serialization.property("search_units", core.serialization.number().optional()),
    classifications: core.serialization.number().optional(),
});

},{"../../core":135}],229:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthTokenType = void 0;
const core = __importStar(require("../../core"));
exports.AuthTokenType = core.serialization.enum_(["bearer", "basic", "noscheme"]);

},{"../../core":135}],230:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatCitation = void 0;
const core = __importStar(require("../../core"));
exports.ChatCitation = core.serialization.object({
    start: core.serialization.number(),
    end: core.serialization.number(),
    text: core.serialization.string(),
    documentIds: core.serialization.property("document_ids", core.serialization.list(core.serialization.string())),
});

},{"../../core":135}],231:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatCitationGenerationEvent = void 0;
const core = __importStar(require("../../core"));
exports.ChatCitationGenerationEvent = core.serialization
    .object({
    citations: core.serialization.list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatCitation; }))),
})
    .extend(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatStreamEvent; })));

},{"..":205,"../../core":135}],232:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatConnector = void 0;
const core = __importStar(require("../../core"));
exports.ChatConnector = core.serialization.object({
    id: core.serialization.string(),
    userAccessToken: core.serialization.property("user_access_token", core.serialization.string().optional()),
    continueOnFailure: core.serialization.property("continue_on_failure", core.serialization.boolean().optional()),
    options: core.serialization.record(core.serialization.string(), core.serialization.unknown()).optional(),
});

},{"../../core":135}],233:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatDocument = void 0;
const core = __importStar(require("../../core"));
exports.ChatDocument = core.serialization.record(core.serialization.string(), core.serialization.string());

},{"../../core":135}],234:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessage = void 0;
const core = __importStar(require("../../core"));
exports.ChatMessage = core.serialization.object({
    role: core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatMessageRole; })),
    message: core.serialization.string(),
    userName: core.serialization.property("user_name", core.serialization.string().optional()),
});

},{"..":205,"../../core":135}],235:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessageRole = void 0;
const core = __importStar(require("../../core"));
exports.ChatMessageRole = core.serialization.enum_(["CHATBOT", "USER"]);

},{"../../core":135}],236:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRequestCitationQuality = void 0;
const core = __importStar(require("../../core"));
exports.ChatRequestCitationQuality = core.serialization.enum_(["fast", "accurate"]);

},{"../../core":135}],237:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRequestPromptTruncation = void 0;
const core = __importStar(require("../../core"));
exports.ChatRequestPromptTruncation = core.serialization.enum_(["OFF", "AUTO"]);

},{"../../core":135}],238:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSearchQueriesGenerationEvent = void 0;
const core = __importStar(require("../../core"));
exports.ChatSearchQueriesGenerationEvent = core.serialization
    .object({
    searchQueries: core.serialization.property("search_queries", core.serialization.list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatSearchQuery; })))),
})
    .extend(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatStreamEvent; })));

},{"..":205,"../../core":135}],239:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSearchQuery = void 0;
const core = __importStar(require("../../core"));
exports.ChatSearchQuery = core.serialization.object({
    text: core.serialization.string(),
    generationId: core.serialization.property("generation_id", core.serialization.string()),
});

},{"../../core":135}],240:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSearchResult = void 0;
const core = __importStar(require("../../core"));
exports.ChatSearchResult = core.serialization.object({
    searchQuery: core.serialization.property("search_query", core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatSearchQuery; }))),
    connector: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatConnector; })),
    documentIds: core.serialization.property("document_ids", core.serialization.list(core.serialization.string())),
});

},{"..":205,"../../core":135}],241:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSearchResultsEvent = void 0;
const core = __importStar(require("../../core"));
exports.ChatSearchResultsEvent = core.serialization
    .object({
    searchResults: core.serialization.property("search_results", core.serialization.list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatSearchResult; })))),
    documents: core.serialization.list(core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatDocument; }))),
})
    .extend(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatStreamEvent; })));

},{"..":205,"../../core":135}],242:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStreamEndEvent = void 0;
const core = __importStar(require("../../core"));
exports.ChatStreamEndEvent = core.serialization
    .object({
    finishReason: core.serialization.property("finish_reason", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatStreamEndEventFinishReason; }))),
    response: core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatStreamEndEventResponse; })),
})
    .extend(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatStreamEvent; })));

},{"..":205,"../../core":135}],243:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStreamEndEventFinishReason = void 0;
const core = __importStar(require("../../core"));
exports.ChatStreamEndEventFinishReason = core.serialization.enum_(["COMPLETE", "ERROR_LIMIT", "MAX_TOKENS", "ERROR", "ERROR_TOXIC"]);

},{"../../core":135}],244:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStreamEndEventResponse = void 0;
const core = __importStar(require("../../core"));
exports.ChatStreamEndEventResponse = core.serialization.undiscriminatedUnion([
    core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).NonStreamedChatResponse; })),
    core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).SearchQueriesOnlyResponse; })),
]);

},{"..":205,"../../core":135}],245:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStreamEvent = void 0;
const core = __importStar(require("../../core"));
exports.ChatStreamEvent = core.serialization.object({});

},{"../../core":135}],246:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStreamRequestCitationQuality = void 0;
const core = __importStar(require("../../core"));
exports.ChatStreamRequestCitationQuality = core.serialization.enum_(["fast", "accurate"]);

},{"../../core":135}],247:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStreamRequestPromptTruncation = void 0;
const core = __importStar(require("../../core"));
exports.ChatStreamRequestPromptTruncation = core.serialization.enum_(["OFF", "AUTO"]);

},{"../../core":135}],248:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStreamStartEvent = void 0;
const core = __importStar(require("../../core"));
exports.ChatStreamStartEvent = core.serialization
    .object({
    generationId: core.serialization.property("generation_id", core.serialization.string()),
})
    .extend(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatStreamEvent; })));

},{"..":205,"../../core":135}],249:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatTextGenerationEvent = void 0;
const core = __importStar(require("../../core"));
exports.ChatTextGenerationEvent = core.serialization
    .object({
    text: core.serialization.string(),
})
    .extend(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatStreamEvent; })));

},{"..":205,"../../core":135}],250:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassifyRequestExamplesItem = void 0;
const core = __importStar(require("../../core"));
exports.ClassifyRequestExamplesItem = core.serialization.object({
    text: core.serialization.string().optional(),
    label: core.serialization.string().optional(),
});

},{"../../core":135}],251:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassifyRequestTruncate = void 0;
const core = __importStar(require("../../core"));
exports.ClassifyRequestTruncate = core.serialization.enum_(["NONE", "START", "END"]);

},{"../../core":135}],252:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassifyResponse = void 0;
const core = __importStar(require("../../core"));
exports.ClassifyResponse = core.serialization.object({
    id: core.serialization.string(),
    classifications: core.serialization.list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ClassifyResponseClassificationsItem; }))),
    meta: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMeta; })).optional(),
});

},{"..":205,"../../core":135}],253:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassifyResponseClassificationsItem = void 0;
const core = __importStar(require("../../core"));
exports.ClassifyResponseClassificationsItem = core.serialization.object({
    id: core.serialization.string(),
    input: core.serialization.string().optional(),
    prediction: core.serialization.string().optional(),
    predictions: core.serialization.list(core.serialization.string()),
    confidence: core.serialization.number().optional(),
    confidences: core.serialization.list(core.serialization.number()),
    labels: core.serialization.record(core.serialization.string(), core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ClassifyResponseClassificationsItemLabelsValue; }))),
    classificationType: core.serialization.property("classification_type", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ClassifyResponseClassificationsItemClassificationType; }))),
});

},{"..":205,"../../core":135}],254:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassifyResponseClassificationsItemClassificationType = void 0;
const core = __importStar(require("../../core"));
exports.ClassifyResponseClassificationsItemClassificationType = core.serialization.enum_(["single-label", "multi-label"]);

},{"../../core":135}],255:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassifyResponseClassificationsItemLabelsValue = void 0;
const core = __importStar(require("../../core"));
exports.ClassifyResponseClassificationsItemLabelsValue = core.serialization.object({
    confidence: core.serialization.number().optional(),
});

},{"../../core":135}],256:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connector = void 0;
const core = __importStar(require("../../core"));
exports.Connector = core.serialization.object({
    id: core.serialization.string(),
    organizationId: core.serialization.property("organization_id", core.serialization.string().optional()),
    name: core.serialization.string(),
    description: core.serialization.string().optional(),
    url: core.serialization.string().optional(),
    createdAt: core.serialization.property("created_at", core.serialization.date()),
    updatedAt: core.serialization.property("updated_at", core.serialization.date()),
    excludes: core.serialization.list(core.serialization.string()).optional(),
    authType: core.serialization.property("auth_type", core.serialization.string().optional()),
    oauth: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ConnectorOAuth; })).optional(),
    authStatus: core.serialization.property("auth_status", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ConnectorAuthStatus; })).optional()),
    active: core.serialization.boolean().optional(),
    continueOnFailure: core.serialization.property("continue_on_failure", core.serialization.boolean().optional()),
});

},{"..":205,"../../core":135}],257:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorAuthStatus = void 0;
const core = __importStar(require("../../core"));
exports.ConnectorAuthStatus = core.serialization.enum_(["valid", "expired"]);

},{"../../core":135}],258:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorOAuth = void 0;
const core = __importStar(require("../../core"));
exports.ConnectorOAuth = core.serialization.object({
    authorizeUrl: core.serialization.property("authorize_url", core.serialization.string()),
    tokenUrl: core.serialization.property("token_url", core.serialization.string()),
    scope: core.serialization.string().optional(),
});

},{"../../core":135}],259:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateConnectorOAuth = void 0;
const core = __importStar(require("../../core"));
exports.CreateConnectorOAuth = core.serialization.object({
    clientId: core.serialization.property("client_id", core.serialization.string().optional()),
    clientSecret: core.serialization.property("client_secret", core.serialization.string().optional()),
    authorizeUrl: core.serialization.property("authorize_url", core.serialization.string().optional()),
    tokenUrl: core.serialization.property("token_url", core.serialization.string().optional()),
    scope: core.serialization.string().optional(),
});

},{"../../core":135}],260:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateConnectorResponse = void 0;
const core = __importStar(require("../../core"));
exports.CreateConnectorResponse = core.serialization.object({
    connector: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).Connector; })),
});

},{"..":205,"../../core":135}],261:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateConnectorServiceAuth = void 0;
const core = __importStar(require("../../core"));
exports.CreateConnectorServiceAuth = core.serialization.object({
    type: core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).AuthTokenType; })),
    token: core.serialization.string(),
});

},{"..":205,"../../core":135}],262:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEmbedJobResponse = void 0;
const core = __importStar(require("../../core"));
exports.CreateEmbedJobResponse = core.serialization.object({
    jobId: core.serialization.property("job_id", core.serialization.string()),
    meta: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMeta; })).optional(),
});

},{"..":205,"../../core":135}],263:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dataset = void 0;
const core = __importStar(require("../../core"));
exports.Dataset = core.serialization.object({
    id: core.serialization.string(),
    name: core.serialization.string(),
    createdAt: core.serialization.property("created_at", core.serialization.date()),
    updatedAt: core.serialization.property("updated_at", core.serialization.date()),
    datasetType: core.serialization.property("dataset_type", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).DatasetType; }))),
    validationStatus: core.serialization.property("validation_status", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).DatasetValidationStatus; }))),
    validationError: core.serialization.property("validation_error", core.serialization.string().optional()),
    schema: core.serialization.string().optional(),
    requiredFields: core.serialization.property("required_fields", core.serialization.list(core.serialization.string()).optional()),
    preserveFields: core.serialization.property("preserve_fields", core.serialization.list(core.serialization.string()).optional()),
    datasetParts: core.serialization.property("dataset_parts", core.serialization
        .list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).DatasetPart; })))
        .optional()),
    validationWarnings: core.serialization.property("validation_warnings", core.serialization.list(core.serialization.string()).optional()),
});

},{"..":205,"../../core":135}],264:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetPart = void 0;
const core = __importStar(require("../../core"));
exports.DatasetPart = core.serialization.object({
    id: core.serialization.string(),
    name: core.serialization.string(),
    url: core.serialization.string().optional(),
    index: core.serialization.number().optional(),
    sizeBytes: core.serialization.property("size_bytes", core.serialization.number().optional()),
    numRows: core.serialization.property("num_rows", core.serialization.number().optional()),
    originalUrl: core.serialization.property("original_url", core.serialization.string().optional()),
});

},{"../../core":135}],265:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetType = void 0;
const core = __importStar(require("../../core"));
exports.DatasetType = core.serialization.enum_([
    "embed-input",
    "embed-result",
    "cluster-result",
    "cluster-outliers",
    "reranker-finetune-input",
    "prompt-completion-finetune-input",
    "single-label-classification-finetune-input",
    "chat-finetune-input",
    "multi-label-classification-finetune-input",
]);

},{"../../core":135}],266:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetValidationStatus = void 0;
const core = __importStar(require("../../core"));
exports.DatasetValidationStatus = core.serialization.enum_(["unknown", "queued", "processing", "failed", "validated", "skipped"]);

},{"../../core":135}],267:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteConnectorResponse = void 0;
const core = __importStar(require("../../core"));
exports.DeleteConnectorResponse = core.serialization.record(core.serialization.string(), core.serialization.unknown());

},{"../../core":135}],268:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectLanguageResponse = void 0;
const core = __importStar(require("../../core"));
exports.DetectLanguageResponse = core.serialization.object({
    results: core.serialization
        .list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).DetectLanguageResponseResultsItem; })))
        .optional(),
    meta: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMeta; })).optional(),
});

},{"..":205,"../../core":135}],269:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectLanguageResponseResultsItem = void 0;
const core = __importStar(require("../../core"));
exports.DetectLanguageResponseResultsItem = core.serialization.object({
    languageName: core.serialization.property("language_name", core.serialization.string().optional()),
    languageCode: core.serialization.property("language_code", core.serialization.string().optional()),
});

},{"../../core":135}],270:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetokenizeResponse = void 0;
const core = __importStar(require("../../core"));
exports.DetokenizeResponse = core.serialization.object({
    text: core.serialization.string(),
    meta: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMeta; })).optional(),
});

},{"..":205,"../../core":135}],271:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedByTypeResponse = void 0;
const core = __importStar(require("../../core"));
exports.EmbedByTypeResponse = core.serialization.object({
    id: core.serialization.string(),
    embeddings: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).EmbedByTypeResponseEmbeddings; })),
    texts: core.serialization.list(core.serialization.string()),
    meta: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMeta; })).optional(),
});

},{"..":205,"../../core":135}],272:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedByTypeResponseEmbeddings = void 0;
const core = __importStar(require("../../core"));
exports.EmbedByTypeResponseEmbeddings = core.serialization.object({
    float: core.serialization.list(core.serialization.list(core.serialization.number())).optional(),
    int8: core.serialization.list(core.serialization.list(core.serialization.number())).optional(),
    uint8: core.serialization.list(core.serialization.list(core.serialization.number())).optional(),
    binary: core.serialization.list(core.serialization.list(core.serialization.number())).optional(),
    ubinary: core.serialization.list(core.serialization.list(core.serialization.number())).optional(),
});

},{"../../core":135}],273:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedFloatsResponse = void 0;
const core = __importStar(require("../../core"));
exports.EmbedFloatsResponse = core.serialization.object({
    id: core.serialization.string(),
    embeddings: core.serialization.list(core.serialization.list(core.serialization.number())),
    texts: core.serialization.list(core.serialization.string()),
    meta: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMeta; })).optional(),
});

},{"..":205,"../../core":135}],274:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedInputType = void 0;
const core = __importStar(require("../../core"));
exports.EmbedInputType = core.serialization.enum_(["search_document", "search_query", "classification", "clustering"]);

},{"../../core":135}],275:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedJob = void 0;
const core = __importStar(require("../../core"));
exports.EmbedJob = core.serialization.object({
    jobId: core.serialization.property("job_id", core.serialization.string()),
    name: core.serialization.string().optional(),
    status: core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).EmbedJobStatus; })),
    createdAt: core.serialization.property("created_at", core.serialization.date()),
    inputDatasetId: core.serialization.property("input_dataset_id", core.serialization.string()),
    outputDatasetId: core.serialization.property("output_dataset_id", core.serialization.string().optional()),
    model: core.serialization.string(),
    truncate: core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).EmbedJobTruncate; })),
    meta: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMeta; })).optional(),
});

},{"..":205,"../../core":135}],276:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedJobStatus = void 0;
const core = __importStar(require("../../core"));
exports.EmbedJobStatus = core.serialization.enum_(["processing", "complete", "cancelling", "cancelled", "failed"]);

},{"../../core":135}],277:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedJobTruncate = void 0;
const core = __importStar(require("../../core"));
exports.EmbedJobTruncate = core.serialization.enum_(["START", "END"]);

},{"../../core":135}],278:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedRequestTruncate = void 0;
const core = __importStar(require("../../core"));
exports.EmbedRequestTruncate = core.serialization.enum_(["NONE", "START", "END"]);

},{"../../core":135}],279:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedResponse = void 0;
const core = __importStar(require("../../core"));
exports.EmbedResponse = core.serialization
    .union(core.serialization.discriminant("responseType", "response_type"), {
    embeddings_floats: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).EmbedFloatsResponse; })),
    embeddings_by_type: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).EmbedByTypeResponse; })),
})
    .transform({
    transform: (value) => value,
    untransform: (value) => value,
});

},{"..":205,"../../core":135}],280:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinishReason = void 0;
const core = __importStar(require("../../core"));
exports.FinishReason = core.serialization.enum_(["COMPLETE", "ERROR", "ERROR_TOXIC", "ERROR_LIMIT", "USER_CANCEL", "MAX_TOKENS"]);

},{"../../core":135}],281:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateRequestReturnLikelihoods = void 0;
const core = __importStar(require("../../core"));
exports.GenerateRequestReturnLikelihoods = core.serialization.enum_(["GENERATION", "ALL", "NONE"]);

},{"../../core":135}],282:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateRequestTruncate = void 0;
const core = __importStar(require("../../core"));
exports.GenerateRequestTruncate = core.serialization.enum_(["NONE", "START", "END"]);

},{"../../core":135}],283:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateStreamEnd = void 0;
const core = __importStar(require("../../core"));
exports.GenerateStreamEnd = core.serialization
    .object({
    isFinished: core.serialization.property("is_finished", core.serialization.boolean()),
    finishReason: core.serialization.property("finish_reason", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).FinishReason; })).optional()),
    response: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).GenerateStreamEndResponse; })),
})
    .extend(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).GenerateStreamEvent; })));

},{"..":205,"../../core":135}],284:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateStreamEndResponse = void 0;
const core = __importStar(require("../../core"));
exports.GenerateStreamEndResponse = core.serialization.object({
    id: core.serialization.string(),
    prompt: core.serialization.string().optional(),
    generations: core.serialization
        .list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).SingleGenerationInStream; })))
        .optional(),
});

},{"..":205,"../../core":135}],285:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateStreamError = void 0;
const core = __importStar(require("../../core"));
exports.GenerateStreamError = core.serialization
    .object({
    index: core.serialization.number().optional(),
    isFinished: core.serialization.property("is_finished", core.serialization.boolean()),
    finishReason: core.serialization.property("finish_reason", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).FinishReason; }))),
    err: core.serialization.string(),
})
    .extend(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).GenerateStreamEvent; })));

},{"..":205,"../../core":135}],286:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateStreamEvent = void 0;
const core = __importStar(require("../../core"));
exports.GenerateStreamEvent = core.serialization.object({});

},{"../../core":135}],287:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateStreamRequestReturnLikelihoods = void 0;
const core = __importStar(require("../../core"));
exports.GenerateStreamRequestReturnLikelihoods = core.serialization.enum_(["GENERATION", "ALL", "NONE"]);

},{"../../core":135}],288:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateStreamRequestTruncate = void 0;
const core = __importStar(require("../../core"));
exports.GenerateStreamRequestTruncate = core.serialization.enum_(["NONE", "START", "END"]);

},{"../../core":135}],289:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateStreamText = void 0;
const core = __importStar(require("../../core"));
exports.GenerateStreamText = core.serialization
    .object({
    text: core.serialization.string(),
    index: core.serialization.number().optional(),
    isFinished: core.serialization.property("is_finished", core.serialization.boolean()),
})
    .extend(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).GenerateStreamEvent; })));

},{"..":205,"../../core":135}],290:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateStreamedResponse = void 0;
const core = __importStar(require("../../core"));
exports.GenerateStreamedResponse = core.serialization
    .union(core.serialization.discriminant("eventType", "event_type"), {
    "text-generation": core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).GenerateStreamText; })),
    "stream-end": core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).GenerateStreamEnd; })),
    "stream-error": core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).GenerateStreamError; })),
})
    .transform({
    transform: (value) => value,
    untransform: (value) => value,
});

},{"..":205,"../../core":135}],291:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Generation = void 0;
const core = __importStar(require("../../core"));
exports.Generation = core.serialization.object({
    id: core.serialization.string(),
    prompt: core.serialization.string().optional(),
    generations: core.serialization.list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).SingleGeneration; }))),
    meta: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMeta; })).optional(),
});

},{"..":205,"../../core":135}],292:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetConnectorResponse = void 0;
const core = __importStar(require("../../core"));
exports.GetConnectorResponse = core.serialization.object({
    connector: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).Connector; })),
});

},{"..":205,"../../core":135}],293:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListConnectorsResponse = void 0;
const core = __importStar(require("../../core"));
exports.ListConnectorsResponse = core.serialization.object({
    connectors: core.serialization.list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).Connector; }))),
});

},{"..":205,"../../core":135}],294:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListEmbedJobResponse = void 0;
const core = __importStar(require("../../core"));
exports.ListEmbedJobResponse = core.serialization.object({
    embedJobs: core.serialization.property("embed_jobs", core.serialization.list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).EmbedJob; }))).optional()),
});

},{"..":205,"../../core":135}],295:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonStreamedChatResponse = void 0;
const core = __importStar(require("../../core"));
exports.NonStreamedChatResponse = core.serialization.object({
    text: core.serialization.string(),
    generationId: core.serialization.property("generation_id", core.serialization.string()),
    citations: core.serialization
        .list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatCitation; })))
        .optional(),
    documents: core.serialization
        .list(core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatDocument; })))
        .optional(),
    searchQueries: core.serialization.property("search_queries", core.serialization
        .list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatSearchQuery; })))
        .optional()),
    searchResults: core.serialization.property("search_results", core.serialization
        .list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatSearchResult; })))
        .optional()),
});

},{"..":205,"../../core":135}],296:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthAuthorizeResponse = void 0;
const core = __importStar(require("../../core"));
exports.OAuthAuthorizeResponse = core.serialization.object({
    redirectUrl: core.serialization.property("redirect_url", core.serialization.string().optional()),
});

},{"../../core":135}],297:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RerankRequestDocumentsItem = void 0;
const core = __importStar(require("../../core"));
exports.RerankRequestDocumentsItem = core.serialization.undiscriminatedUnion([
    core.serialization.string(),
    core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).RerankRequestDocumentsItemText; })),
]);

},{"..":205,"../../core":135}],298:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RerankRequestDocumentsItemText = void 0;
const core = __importStar(require("../../core"));
exports.RerankRequestDocumentsItemText = core.serialization.object({
    text: core.serialization.string(),
});

},{"../../core":135}],299:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RerankResponse = void 0;
const core = __importStar(require("../../core"));
exports.RerankResponse = core.serialization.object({
    id: core.serialization.string().optional(),
    results: core.serialization.list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).RerankResponseResultsItem; }))),
    meta: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMeta; })).optional(),
});

},{"..":205,"../../core":135}],300:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RerankResponseResultsItem = void 0;
const core = __importStar(require("../../core"));
exports.RerankResponseResultsItem = core.serialization.object({
    document: core.serialization
        .lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).RerankResponseResultsItemDocument; }))
        .optional(),
    index: core.serialization.number(),
    relevanceScore: core.serialization.property("relevance_score", core.serialization.number()),
});

},{"..":205,"../../core":135}],301:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RerankResponseResultsItemDocument = void 0;
const core = __importStar(require("../../core"));
exports.RerankResponseResultsItemDocument = core.serialization.object({
    text: core.serialization.string(),
});

},{"../../core":135}],302:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchQueriesOnlyResponse = void 0;
const core = __importStar(require("../../core"));
exports.SearchQueriesOnlyResponse = core.serialization.object({
    searchQueries: core.serialization.property("search_queries", core.serialization.list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatSearchQuery; })))),
});

},{"..":205,"../../core":135}],303:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleGeneration = void 0;
const core = __importStar(require("../../core"));
exports.SingleGeneration = core.serialization.object({
    id: core.serialization.string(),
    text: core.serialization.string(),
    index: core.serialization.number().optional(),
    likelihood: core.serialization.number().optional(),
    tokenLikelihoods: core.serialization.property("token_likelihoods", core.serialization
        .list(core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).SingleGenerationTokenLikelihoodsItem; })))
        .optional()),
});

},{"..":205,"../../core":135}],304:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleGenerationInStream = void 0;
const core = __importStar(require("../../core"));
exports.SingleGenerationInStream = core.serialization.object({
    id: core.serialization.string(),
    text: core.serialization.string(),
    index: core.serialization.number().optional(),
    finishReason: core.serialization.property("finish_reason", core.serialization.lazy(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).FinishReason; }))),
});

},{"..":205,"../../core":135}],305:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleGenerationTokenLikelihoodsItem = void 0;
const core = __importStar(require("../../core"));
exports.SingleGenerationTokenLikelihoodsItem = core.serialization.object({
    token: core.serialization.string(),
    likelihood: core.serialization.number(),
});

},{"../../core":135}],306:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamedChatResponse = void 0;
const core = __importStar(require("../../core"));
exports.StreamedChatResponse = core.serialization
    .union(core.serialization.discriminant("eventType", "event_type"), {
    "stream-start": core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatStreamStartEvent; })),
    "search-queries-generation": core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatSearchQueriesGenerationEvent; })),
    "search-results": core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatSearchResultsEvent; })),
    "text-generation": core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatTextGenerationEvent; })),
    "citation-generation": core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatCitationGenerationEvent; })),
    "stream-end": core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ChatStreamEndEvent; })),
})
    .transform({
    transform: (value) => value,
    untransform: (value) => value,
});

},{"..":205,"../../core":135}],307:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizeRequestExtractiveness = void 0;
const core = __importStar(require("../../core"));
exports.SummarizeRequestExtractiveness = core.serialization.enum_(["low", "medium", "high"]);

},{"../../core":135}],308:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizeRequestFormat = void 0;
const core = __importStar(require("../../core"));
exports.SummarizeRequestFormat = core.serialization.enum_(["paragraph", "bullets"]);

},{"../../core":135}],309:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizeRequestLength = void 0;
const core = __importStar(require("../../core"));
exports.SummarizeRequestLength = core.serialization.enum_(["short", "medium", "long"]);

},{"../../core":135}],310:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizeResponse = void 0;
const core = __importStar(require("../../core"));
exports.SummarizeResponse = core.serialization.object({
    id: core.serialization.string().optional(),
    summary: core.serialization.string().optional(),
    meta: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMeta; })).optional(),
});

},{"..":205,"../../core":135}],311:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenizeResponse = void 0;
const core = __importStar(require("../../core"));
exports.TokenizeResponse = core.serialization.object({
    tokens: core.serialization.list(core.serialization.number()),
    tokenStrings: core.serialization.property("token_strings", core.serialization.list(core.serialization.string())),
    meta: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).ApiMeta; })).optional(),
});

},{"..":205,"../../core":135}],312:[function(require,module,exports){
"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateConnectorResponse = void 0;
const core = __importStar(require("../../core"));
exports.UpdateConnectorResponse = core.serialization.object({
    connector: core.serialization.lazyObject(() => __awaiter(void 0, void 0, void 0, function* () { return (yield Promise.resolve().then(() => __importStar(require("..")))).Connector; })),
});

},{"..":205,"../../core":135}],313:[function(require,module,exports){
arguments[4][127][0].apply(exports,arguments)
},{"./ApiMeta":226,"./ApiMetaApiVersion":227,"./ApiMetaBilledUnits":228,"./AuthTokenType":229,"./ChatCitation":230,"./ChatCitationGenerationEvent":231,"./ChatConnector":232,"./ChatDocument":233,"./ChatMessage":234,"./ChatMessageRole":235,"./ChatRequestCitationQuality":236,"./ChatRequestPromptTruncation":237,"./ChatSearchQueriesGenerationEvent":238,"./ChatSearchQuery":239,"./ChatSearchResult":240,"./ChatSearchResultsEvent":241,"./ChatStreamEndEvent":242,"./ChatStreamEndEventFinishReason":243,"./ChatStreamEndEventResponse":244,"./ChatStreamEvent":245,"./ChatStreamRequestCitationQuality":246,"./ChatStreamRequestPromptTruncation":247,"./ChatStreamStartEvent":248,"./ChatTextGenerationEvent":249,"./ClassifyRequestExamplesItem":250,"./ClassifyRequestTruncate":251,"./ClassifyResponse":252,"./ClassifyResponseClassificationsItem":253,"./ClassifyResponseClassificationsItemClassificationType":254,"./ClassifyResponseClassificationsItemLabelsValue":255,"./Connector":256,"./ConnectorAuthStatus":257,"./ConnectorOAuth":258,"./CreateConnectorOAuth":259,"./CreateConnectorResponse":260,"./CreateConnectorServiceAuth":261,"./CreateEmbedJobResponse":262,"./Dataset":263,"./DatasetPart":264,"./DatasetType":265,"./DatasetValidationStatus":266,"./DeleteConnectorResponse":267,"./DetectLanguageResponse":268,"./DetectLanguageResponseResultsItem":269,"./DetokenizeResponse":270,"./EmbedByTypeResponse":271,"./EmbedByTypeResponseEmbeddings":272,"./EmbedFloatsResponse":273,"./EmbedInputType":274,"./EmbedJob":275,"./EmbedJobStatus":276,"./EmbedJobTruncate":277,"./EmbedRequestTruncate":278,"./EmbedResponse":279,"./FinishReason":280,"./GenerateRequestReturnLikelihoods":281,"./GenerateRequestTruncate":282,"./GenerateStreamEnd":283,"./GenerateStreamEndResponse":284,"./GenerateStreamError":285,"./GenerateStreamEvent":286,"./GenerateStreamRequestReturnLikelihoods":287,"./GenerateStreamRequestTruncate":288,"./GenerateStreamText":289,"./GenerateStreamedResponse":290,"./Generation":291,"./GetConnectorResponse":292,"./ListConnectorsResponse":293,"./ListEmbedJobResponse":294,"./NonStreamedChatResponse":295,"./OAuthAuthorizeResponse":296,"./RerankRequestDocumentsItem":297,"./RerankRequestDocumentsItemText":298,"./RerankResponse":299,"./RerankResponseResultsItem":300,"./RerankResponseResultsItemDocument":301,"./SearchQueriesOnlyResponse":302,"./SingleGeneration":303,"./SingleGenerationInStream":304,"./SingleGenerationTokenLikelihoodsItem":305,"./StreamedChatResponse":306,"./SummarizeRequestExtractiveness":307,"./SummarizeRequestFormat":308,"./SummarizeRequestLength":309,"./SummarizeResponse":310,"./TokenizeResponse":311,"./UpdateConnectorResponse":312,"dup":127}],314:[function(require,module,exports){
'use strict';

var hasPropertyDescriptors = require('has-property-descriptors')();

var GetIntrinsic = require('get-intrinsic');

var $defineProperty = hasPropertyDescriptors && GetIntrinsic('%Object.defineProperty%', true);
if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = false;
	}
}

var $SyntaxError = GetIntrinsic('%SyntaxError%');
var $TypeError = GetIntrinsic('%TypeError%');

var gopd = require('gopd');

/** @type {(obj: Record<PropertyKey, unknown>, property: PropertyKey, value: unknown, nonEnumerable?: boolean | null, nonWritable?: boolean | null, nonConfigurable?: boolean | null, loose?: boolean) => void} */
module.exports = function defineDataProperty(
	obj,
	property,
	value
) {
	if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
		throw new $TypeError('`obj` must be an object or a function`');
	}
	if (typeof property !== 'string' && typeof property !== 'symbol') {
		throw new $TypeError('`property` must be a string or a symbol`');
	}
	if (arguments.length > 3 && typeof arguments[3] !== 'boolean' && arguments[3] !== null) {
		throw new $TypeError('`nonEnumerable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 4 && typeof arguments[4] !== 'boolean' && arguments[4] !== null) {
		throw new $TypeError('`nonWritable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 5 && typeof arguments[5] !== 'boolean' && arguments[5] !== null) {
		throw new $TypeError('`nonConfigurable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 6 && typeof arguments[6] !== 'boolean') {
		throw new $TypeError('`loose`, if provided, must be a boolean');
	}

	var nonEnumerable = arguments.length > 3 ? arguments[3] : null;
	var nonWritable = arguments.length > 4 ? arguments[4] : null;
	var nonConfigurable = arguments.length > 5 ? arguments[5] : null;
	var loose = arguments.length > 6 ? arguments[6] : false;

	/* @type {false | TypedPropertyDescriptor<unknown>} */
	var desc = !!gopd && gopd(obj, property);

	if ($defineProperty) {
		$defineProperty(obj, property, {
			configurable: nonConfigurable === null && desc ? desc.configurable : !nonConfigurable,
			enumerable: nonEnumerable === null && desc ? desc.enumerable : !nonEnumerable,
			value: value,
			writable: nonWritable === null && desc ? desc.writable : !nonWritable
		});
	} else if (loose || (!nonEnumerable && !nonWritable && !nonConfigurable)) {
		// must fall back to [[Set]], and was not explicitly asked to make non-enumerable, non-writable, or non-configurable
		obj[property] = value; // eslint-disable-line no-param-reassign
	} else {
		throw new $SyntaxError('This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.');
	}
};

},{"get-intrinsic":318,"gopd":319,"has-property-descriptors":320}],315:[function(require,module,exports){
/* eslint-env browser */
module.exports = typeof self == 'object' ? self.FormData : window.FormData;

},{}],316:[function(require,module,exports){
'use strict';

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var toStr = Object.prototype.toString;
var max = Math.max;
var funcType = '[object Function]';

var concatty = function concatty(a, b) {
    var arr = [];

    for (var i = 0; i < a.length; i += 1) {
        arr[i] = a[i];
    }
    for (var j = 0; j < b.length; j += 1) {
        arr[j + a.length] = b[j];
    }

    return arr;
};

var slicy = function slicy(arrLike, offset) {
    var arr = [];
    for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
        arr[j] = arrLike[i];
    }
    return arr;
};

var joiny = function (arr, joiner) {
    var str = '';
    for (var i = 0; i < arr.length; i += 1) {
        str += arr[i];
        if (i + 1 < arr.length) {
            str += joiner;
        }
    }
    return str;
};

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.apply(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slicy(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                concatty(args, arguments)
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        }
        return target.apply(
            that,
            concatty(args, arguments)
        );

    };

    var boundLength = max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs[i] = '$' + i;
    }

    bound = Function('binder', 'return function (' + joiny(boundArgs, ',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

},{}],317:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":316}],318:[function(require,module,exports){
'use strict';

var undefined;

var $SyntaxError = SyntaxError;
var $Function = Function;
var $TypeError = TypeError;

// eslint-disable-next-line consistent-return
var getEvalledConstructor = function (expressionSyntax) {
	try {
		return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
	} catch (e) {}
};

var $gOPD = Object.getOwnPropertyDescriptor;
if ($gOPD) {
	try {
		$gOPD({}, '');
	} catch (e) {
		$gOPD = null; // this is IE 8, which has a broken gOPD
	}
}

var throwTypeError = function () {
	throw new $TypeError();
};
var ThrowTypeError = $gOPD
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols = require('has-symbols')();
var hasProto = require('has-proto')();

var getProto = Object.getPrototypeOf || (
	hasProto
		? function (x) { return x.__proto__; } // eslint-disable-line no-proto
		: null
);

var needsEval = {};

var TypedArray = typeof Uint8Array === 'undefined' || !getProto ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined : AggregateError,
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'%ArrayIteratorPrototype%': hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined,
	'%AsyncFromSyncIteratorPrototype%': undefined,
	'%AsyncFunction%': needsEval,
	'%AsyncGenerator%': needsEval,
	'%AsyncGeneratorFunction%': needsEval,
	'%AsyncIteratorPrototype%': needsEval,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'%BigInt%': typeof BigInt === 'undefined' ? undefined : BigInt,
	'%BigInt64Array%': typeof BigInt64Array === 'undefined' ? undefined : BigInt64Array,
	'%BigUint64Array%': typeof BigUint64Array === 'undefined' ? undefined : BigUint64Array,
	'%Boolean%': Boolean,
	'%DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'%Date%': Date,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': Error,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': EvalError,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined : FinalizationRegistry,
	'%Function%': $Function,
	'%GeneratorFunction%': needsEval,
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined,
	'%Map%': typeof Map === 'undefined' ? undefined : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols || !getProto ? undefined : getProto(new Map()[Symbol.iterator]()),
	'%Math%': Math,
	'%Number%': Number,
	'%Object%': Object,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'%RangeError%': RangeError,
	'%ReferenceError%': ReferenceError,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'%RegExp%': RegExp,
	'%Set%': typeof Set === 'undefined' ? undefined : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols || !getProto ? undefined : getProto(new Set()[Symbol.iterator]()),
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols && getProto ? getProto(''[Symbol.iterator]()) : undefined,
	'%Symbol%': hasSymbols ? Symbol : undefined,
	'%SyntaxError%': $SyntaxError,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypeError%': $TypeError,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'%URIError%': URIError,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined : WeakRef,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet
};

if (getProto) {
	try {
		null.error; // eslint-disable-line no-unused-expressions
	} catch (e) {
		// https://github.com/tc39/proposal-shadowrealm/pull/384#issuecomment-1364264229
		var errorProto = getProto(getProto(e));
		INTRINSICS['%Error.prototype%'] = errorProto;
	}
}

var doEval = function doEval(name) {
	var value;
	if (name === '%AsyncFunction%') {
		value = getEvalledConstructor('async function () {}');
	} else if (name === '%GeneratorFunction%') {
		value = getEvalledConstructor('function* () {}');
	} else if (name === '%AsyncGeneratorFunction%') {
		value = getEvalledConstructor('async function* () {}');
	} else if (name === '%AsyncGenerator%') {
		var fn = doEval('%AsyncGeneratorFunction%');
		if (fn) {
			value = fn.prototype;
		}
	} else if (name === '%AsyncIteratorPrototype%') {
		var gen = doEval('%AsyncGenerator%');
		if (gen && getProto) {
			value = getProto(gen.prototype);
		}
	}

	INTRINSICS[name] = value;

	return value;
};

var LEGACY_ALIASES = {
	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
	'%ArrayPrototype%': ['Array', 'prototype'],
	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
	'%BooleanPrototype%': ['Boolean', 'prototype'],
	'%DataViewPrototype%': ['DataView', 'prototype'],
	'%DatePrototype%': ['Date', 'prototype'],
	'%ErrorPrototype%': ['Error', 'prototype'],
	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
	'%FunctionPrototype%': ['Function', 'prototype'],
	'%Generator%': ['GeneratorFunction', 'prototype'],
	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
	'%JSONParse%': ['JSON', 'parse'],
	'%JSONStringify%': ['JSON', 'stringify'],
	'%MapPrototype%': ['Map', 'prototype'],
	'%NumberPrototype%': ['Number', 'prototype'],
	'%ObjectPrototype%': ['Object', 'prototype'],
	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
	'%PromisePrototype%': ['Promise', 'prototype'],
	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
	'%Promise_all%': ['Promise', 'all'],
	'%Promise_reject%': ['Promise', 'reject'],
	'%Promise_resolve%': ['Promise', 'resolve'],
	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
	'%RegExpPrototype%': ['RegExp', 'prototype'],
	'%SetPrototype%': ['Set', 'prototype'],
	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
	'%StringPrototype%': ['String', 'prototype'],
	'%SymbolPrototype%': ['Symbol', 'prototype'],
	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
	'%URIErrorPrototype%': ['URIError', 'prototype'],
	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
	'%WeakSetPrototype%': ['WeakSet', 'prototype']
};

var bind = require('function-bind');
var hasOwn = require('hasown');
var $concat = bind.call(Function.call, Array.prototype.concat);
var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
var $replace = bind.call(Function.call, String.prototype.replace);
var $strSlice = bind.call(Function.call, String.prototype.slice);
var $exec = bind.call(Function.call, RegExp.prototype.exec);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var first = $strSlice(string, 0, 1);
	var last = $strSlice(string, -1);
	if (first === '%' && last !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
	} else if (last === '%' && first !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
	}
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	var intrinsicName = name;
	var alias;
	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
		alias = LEGACY_ALIASES[intrinsicName];
		intrinsicName = '%' + alias[0] + '%';
	}

	if (hasOwn(INTRINSICS, intrinsicName)) {
		var value = INTRINSICS[intrinsicName];
		if (value === needsEval) {
			value = doEval(intrinsicName);
		}
		if (typeof value === 'undefined' && !allowMissing) {
			throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
		}

		return {
			alias: alias,
			name: intrinsicName,
			value: value
		};
	}

	throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new $TypeError('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new $TypeError('"allowMissing" argument must be a boolean');
	}

	if ($exec(/^%?[^%]*%?$/, name) === null) {
		throw new $SyntaxError('`%` may not be present anywhere but at the beginning and end of the intrinsic name');
	}
	var parts = stringToPath(name);
	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
	var intrinsicRealName = intrinsic.name;
	var value = intrinsic.value;
	var skipFurtherCaching = false;

	var alias = intrinsic.alias;
	if (alias) {
		intrinsicBaseName = alias[0];
		$spliceApply(parts, $concat([0, 1], alias));
	}

	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
		var part = parts[i];
		var first = $strSlice(part, 0, 1);
		var last = $strSlice(part, -1);
		if (
			(
				(first === '"' || first === "'" || first === '`')
				|| (last === '"' || last === "'" || last === '`')
			)
			&& first !== last
		) {
			throw new $SyntaxError('property names with quotes must have matching quotes');
		}
		if (part === 'constructor' || !isOwn) {
			skipFurtherCaching = true;
		}

		intrinsicBaseName += '.' + part;
		intrinsicRealName = '%' + intrinsicBaseName + '%';

		if (hasOwn(INTRINSICS, intrinsicRealName)) {
			value = INTRINSICS[intrinsicRealName];
		} else if (value != null) {
			if (!(part in value)) {
				if (!allowMissing) {
					throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				return void undefined;
			}
			if ($gOPD && (i + 1) >= parts.length) {
				var desc = $gOPD(value, part);
				isOwn = !!desc;

				// By convention, when a data property is converted to an accessor
				// property to emulate a data property that does not suffer from
				// the override mistake, that accessor's getter is marked with
				// an `originalValue` property. Here, when we detect this, we
				// uphold the illusion by pretending to see that original data
				// property, i.e., returning the value rather than the getter
				// itself.
				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
					value = desc.get;
				} else {
					value = value[part];
				}
			} else {
				isOwn = hasOwn(value, part);
				value = value[part];
			}

			if (isOwn && !skipFurtherCaching) {
				INTRINSICS[intrinsicRealName] = value;
			}
		}
	}
	return value;
};

},{"function-bind":317,"has-proto":321,"has-symbols":322,"hasown":324}],319:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);

if ($gOPD) {
	try {
		$gOPD([], 'length');
	} catch (e) {
		// IE 8 has a broken gOPD
		$gOPD = null;
	}
}

module.exports = $gOPD;

},{"get-intrinsic":318}],320:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');

var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);

var hasPropertyDescriptors = function hasPropertyDescriptors() {
	if ($defineProperty) {
		try {
			$defineProperty({}, 'a', { value: 1 });
			return true;
		} catch (e) {
			// IE 8 has a broken defineProperty
			return false;
		}
	}
	return false;
};

hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
	// node v0.6 has a bug where array lengths can be Set but not Defined
	if (!hasPropertyDescriptors()) {
		return null;
	}
	try {
		return $defineProperty([], 'length', { value: 1 }).length !== 1;
	} catch (e) {
		// In Firefox 4-22, defining length on an array throws an exception.
		return true;
	}
};

module.exports = hasPropertyDescriptors;

},{"get-intrinsic":318}],321:[function(require,module,exports){
'use strict';

var test = {
	foo: {}
};

var $Object = Object;

module.exports = function hasProto() {
	return { __proto__: test }.foo === test.foo && !({ __proto__: null } instanceof $Object);
};

},{}],322:[function(require,module,exports){
'use strict';

var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = require('./shams');

module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};

},{"./shams":323}],323:[function(require,module,exports){
'use strict';

/* eslint complexity: [2, 18], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

},{}],324:[function(require,module,exports){
'use strict';

var call = Function.prototype.call;
var $hasOwn = Object.prototype.hasOwnProperty;
var bind = require('function-bind');

/** @type {(o: {}, p: PropertyKey) => p is keyof o} */
module.exports = bind.call(call, $hasOwn);

},{"function-bind":317}],325:[function(require,module,exports){
(function (global,Buffer){(function (){
//
// THIS FILE IS AUTOMATICALLY GENERATED! DO NOT EDIT BY HAND!
//
;
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined'
        ? module.exports = factory()
        : typeof define === 'function' && define.amd
            ? define(factory) :
            // cf. https://github.com/dankogai/js-base64/issues/119
            (function () {
                // existing version for noConflict()
                var _Base64 = global.Base64;
                var gBase64 = factory();
                gBase64.noConflict = function () {
                    global.Base64 = _Base64;
                    return gBase64;
                };
                if (global.Meteor) { // Meteor.js
                    Base64 = gBase64;
                }
                global.Base64 = gBase64;
            })();
}((typeof self !== 'undefined' ? self
    : typeof window !== 'undefined' ? window
        : typeof global !== 'undefined' ? global
            : this), function () {
    'use strict';
    /**
     *  base64.ts
     *
     *  Licensed under the BSD 3-Clause License.
     *    http://opensource.org/licenses/BSD-3-Clause
     *
     *  References:
     *    http://en.wikipedia.org/wiki/Base64
     *
     * @author Dan Kogai (https://github.com/dankogai)
     */
    var version = '3.7.2';
    /**
     * @deprecated use lowercase `version`.
     */
    var VERSION = version;
    var _hasatob = typeof atob === 'function';
    var _hasbtoa = typeof btoa === 'function';
    var _hasBuffer = typeof Buffer === 'function';
    var _TD = typeof TextDecoder === 'function' ? new TextDecoder() : undefined;
    var _TE = typeof TextEncoder === 'function' ? new TextEncoder() : undefined;
    var b64ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var b64chs = Array.prototype.slice.call(b64ch);
    var b64tab = (function (a) {
        var tab = {};
        a.forEach(function (c, i) { return tab[c] = i; });
        return tab;
    })(b64chs);
    var b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
    var _fromCC = String.fromCharCode.bind(String);
    var _U8Afrom = typeof Uint8Array.from === 'function'
        ? Uint8Array.from.bind(Uint8Array)
        : function (it, fn) {
            if (fn === void 0) { fn = function (x) { return x; }; }
            return new Uint8Array(Array.prototype.slice.call(it, 0).map(fn));
        };
    var _mkUriSafe = function (src) { return src
        .replace(/=/g, '').replace(/[+\/]/g, function (m0) { return m0 == '+' ? '-' : '_'; }); };
    var _tidyB64 = function (s) { return s.replace(/[^A-Za-z0-9\+\/]/g, ''); };
    /**
     * polyfill version of `btoa`
     */
    var btoaPolyfill = function (bin) {
        // console.log('polyfilled');
        var u32, c0, c1, c2, asc = '';
        var pad = bin.length % 3;
        for (var i = 0; i < bin.length;) {
            if ((c0 = bin.charCodeAt(i++)) > 255 ||
                (c1 = bin.charCodeAt(i++)) > 255 ||
                (c2 = bin.charCodeAt(i++)) > 255)
                throw new TypeError('invalid character found');
            u32 = (c0 << 16) | (c1 << 8) | c2;
            asc += b64chs[u32 >> 18 & 63]
                + b64chs[u32 >> 12 & 63]
                + b64chs[u32 >> 6 & 63]
                + b64chs[u32 & 63];
        }
        return pad ? asc.slice(0, pad - 3) + "===".substring(pad) : asc;
    };
    /**
     * does what `window.btoa` of web browsers do.
     * @param {String} bin binary string
     * @returns {string} Base64-encoded string
     */
    var _btoa = _hasbtoa ? function (bin) { return btoa(bin); }
        : _hasBuffer ? function (bin) { return Buffer.from(bin, 'binary').toString('base64'); }
            : btoaPolyfill;
    var _fromUint8Array = _hasBuffer
        ? function (u8a) { return Buffer.from(u8a).toString('base64'); }
        : function (u8a) {
            // cf. https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string/12713326#12713326
            var maxargs = 0x1000;
            var strs = [];
            for (var i = 0, l = u8a.length; i < l; i += maxargs) {
                strs.push(_fromCC.apply(null, u8a.subarray(i, i + maxargs)));
            }
            return _btoa(strs.join(''));
        };
    /**
     * converts a Uint8Array to a Base64 string.
     * @param {boolean} [urlsafe] URL-and-filename-safe a la RFC4648 §5
     * @returns {string} Base64 string
     */
    var fromUint8Array = function (u8a, urlsafe) {
        if (urlsafe === void 0) { urlsafe = false; }
        return urlsafe ? _mkUriSafe(_fromUint8Array(u8a)) : _fromUint8Array(u8a);
    };
    // This trick is found broken https://github.com/dankogai/js-base64/issues/130
    // const utob = (src: string) => unescape(encodeURIComponent(src));
    // reverting good old fationed regexp
    var cb_utob = function (c) {
        if (c.length < 2) {
            var cc = c.charCodeAt(0);
            return cc < 0x80 ? c
                : cc < 0x800 ? (_fromCC(0xc0 | (cc >>> 6))
                    + _fromCC(0x80 | (cc & 0x3f)))
                    : (_fromCC(0xe0 | ((cc >>> 12) & 0x0f))
                        + _fromCC(0x80 | ((cc >>> 6) & 0x3f))
                        + _fromCC(0x80 | (cc & 0x3f)));
        }
        else {
            var cc = 0x10000
                + (c.charCodeAt(0) - 0xD800) * 0x400
                + (c.charCodeAt(1) - 0xDC00);
            return (_fromCC(0xf0 | ((cc >>> 18) & 0x07))
                + _fromCC(0x80 | ((cc >>> 12) & 0x3f))
                + _fromCC(0x80 | ((cc >>> 6) & 0x3f))
                + _fromCC(0x80 | (cc & 0x3f)));
        }
    };
    var re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
    /**
     * @deprecated should have been internal use only.
     * @param {string} src UTF-8 string
     * @returns {string} UTF-16 string
     */
    var utob = function (u) { return u.replace(re_utob, cb_utob); };
    //
    var _encode = _hasBuffer
        ? function (s) { return Buffer.from(s, 'utf8').toString('base64'); }
        : _TE
            ? function (s) { return _fromUint8Array(_TE.encode(s)); }
            : function (s) { return _btoa(utob(s)); };
    /**
     * converts a UTF-8-encoded string to a Base64 string.
     * @param {boolean} [urlsafe] if `true` make the result URL-safe
     * @returns {string} Base64 string
     */
    var encode = function (src, urlsafe) {
        if (urlsafe === void 0) { urlsafe = false; }
        return urlsafe
            ? _mkUriSafe(_encode(src))
            : _encode(src);
    };
    /**
     * converts a UTF-8-encoded string to URL-safe Base64 RFC4648 §5.
     * @returns {string} Base64 string
     */
    var encodeURI = function (src) { return encode(src, true); };
    // This trick is found broken https://github.com/dankogai/js-base64/issues/130
    // const btou = (src: string) => decodeURIComponent(escape(src));
    // reverting good old fationed regexp
    var re_btou = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g;
    var cb_btou = function (cccc) {
        switch (cccc.length) {
            case 4:
                var cp = ((0x07 & cccc.charCodeAt(0)) << 18)
                    | ((0x3f & cccc.charCodeAt(1)) << 12)
                    | ((0x3f & cccc.charCodeAt(2)) << 6)
                    | (0x3f & cccc.charCodeAt(3)), offset = cp - 0x10000;
                return (_fromCC((offset >>> 10) + 0xD800)
                    + _fromCC((offset & 0x3FF) + 0xDC00));
            case 3:
                return _fromCC(((0x0f & cccc.charCodeAt(0)) << 12)
                    | ((0x3f & cccc.charCodeAt(1)) << 6)
                    | (0x3f & cccc.charCodeAt(2)));
            default:
                return _fromCC(((0x1f & cccc.charCodeAt(0)) << 6)
                    | (0x3f & cccc.charCodeAt(1)));
        }
    };
    /**
     * @deprecated should have been internal use only.
     * @param {string} src UTF-16 string
     * @returns {string} UTF-8 string
     */
    var btou = function (b) { return b.replace(re_btou, cb_btou); };
    /**
     * polyfill version of `atob`
     */
    var atobPolyfill = function (asc) {
        // console.log('polyfilled');
        asc = asc.replace(/\s+/g, '');
        if (!b64re.test(asc))
            throw new TypeError('malformed base64.');
        asc += '=='.slice(2 - (asc.length & 3));
        var u24, bin = '', r1, r2;
        for (var i = 0; i < asc.length;) {
            u24 = b64tab[asc.charAt(i++)] << 18
                | b64tab[asc.charAt(i++)] << 12
                | (r1 = b64tab[asc.charAt(i++)]) << 6
                | (r2 = b64tab[asc.charAt(i++)]);
            bin += r1 === 64 ? _fromCC(u24 >> 16 & 255)
                : r2 === 64 ? _fromCC(u24 >> 16 & 255, u24 >> 8 & 255)
                    : _fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255);
        }
        return bin;
    };
    /**
     * does what `window.atob` of web browsers do.
     * @param {String} asc Base64-encoded string
     * @returns {string} binary string
     */
    var _atob = _hasatob ? function (asc) { return atob(_tidyB64(asc)); }
        : _hasBuffer ? function (asc) { return Buffer.from(asc, 'base64').toString('binary'); }
            : atobPolyfill;
    //
    var _toUint8Array = _hasBuffer
        ? function (a) { return _U8Afrom(Buffer.from(a, 'base64')); }
        : function (a) { return _U8Afrom(_atob(a), function (c) { return c.charCodeAt(0); }); };
    /**
     * converts a Base64 string to a Uint8Array.
     */
    var toUint8Array = function (a) { return _toUint8Array(_unURI(a)); };
    //
    var _decode = _hasBuffer
        ? function (a) { return Buffer.from(a, 'base64').toString('utf8'); }
        : _TD
            ? function (a) { return _TD.decode(_toUint8Array(a)); }
            : function (a) { return btou(_atob(a)); };
    var _unURI = function (a) { return _tidyB64(a.replace(/[-_]/g, function (m0) { return m0 == '-' ? '+' : '/'; })); };
    /**
     * converts a Base64 string to a UTF-8 string.
     * @param {String} src Base64 string.  Both normal and URL-safe are supported
     * @returns {string} UTF-8 string
     */
    var decode = function (src) { return _decode(_unURI(src)); };
    /**
     * check if a value is a valid Base64 string
     * @param {String} src a value to check
      */
    var isValid = function (src) {
        if (typeof src !== 'string')
            return false;
        var s = src.replace(/\s+/g, '').replace(/={0,2}$/, '');
        return !/[^\s0-9a-zA-Z\+/]/.test(s) || !/[^\s0-9a-zA-Z\-_]/.test(s);
    };
    //
    var _noEnum = function (v) {
        return {
            value: v, enumerable: false, writable: true, configurable: true
        };
    };
    /**
     * extend String.prototype with relevant methods
     */
    var extendString = function () {
        var _add = function (name, body) { return Object.defineProperty(String.prototype, name, _noEnum(body)); };
        _add('fromBase64', function () { return decode(this); });
        _add('toBase64', function (urlsafe) { return encode(this, urlsafe); });
        _add('toBase64URI', function () { return encode(this, true); });
        _add('toBase64URL', function () { return encode(this, true); });
        _add('toUint8Array', function () { return toUint8Array(this); });
    };
    /**
     * extend Uint8Array.prototype with relevant methods
     */
    var extendUint8Array = function () {
        var _add = function (name, body) { return Object.defineProperty(Uint8Array.prototype, name, _noEnum(body)); };
        _add('toBase64', function (urlsafe) { return fromUint8Array(this, urlsafe); });
        _add('toBase64URI', function () { return fromUint8Array(this, true); });
        _add('toBase64URL', function () { return fromUint8Array(this, true); });
    };
    /**
     * extend Builtin prototypes with relevant methods
     */
    var extendBuiltins = function () {
        extendString();
        extendUint8Array();
    };
    var gBase64 = {
        version: version,
        VERSION: VERSION,
        atob: _atob,
        atobPolyfill: atobPolyfill,
        btoa: _btoa,
        btoaPolyfill: btoaPolyfill,
        fromBase64: decode,
        toBase64: encode,
        encode: encode,
        encodeURI: encodeURI,
        encodeURL: encodeURI,
        utob: utob,
        btou: btou,
        decode: decode,
        isValid: isValid,
        fromUint8Array: fromUint8Array,
        toUint8Array: toUint8Array,
        extendString: extendString,
        extendUint8Array: extendUint8Array,
        extendBuiltins: extendBuiltins
    };
    //
    // export Base64 to the namespace
    //
    // ES5 is yet to have Object.assign() that may make transpilers unhappy.
    // gBase64.Base64 = Object.assign({}, gBase64);
    gBase64.Base64 = {};
    Object.keys(gBase64).forEach(function (k) { return gBase64.Base64[k] = gBase64[k]; });
    return gBase64;
}));

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"buffer":3}],326:[function(require,module,exports){
(function (global){(function (){
"use strict";

// ref: https://github.com/tc39/proposal-global
var getGlobal = function () {
	// the only reliable means to get the global object is
	// `Function('return this')()`
	// However, this causes CSP violations in Chrome apps.
	if (typeof self !== 'undefined') { return self; }
	if (typeof window !== 'undefined') { return window; }
	if (typeof global !== 'undefined') { return global; }
	throw new Error('unable to locate global object');
}

var globalObject = getGlobal();

module.exports = exports = globalObject.fetch;

// Needed for TypeScript and Webpack.
if (globalObject.fetch) {
	exports.default = globalObject.fetch.bind(globalObject);
}

exports.Headers = globalObject.Headers;
exports.Request = globalObject.Request;
exports.Response = globalObject.Response;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],327:[function(require,module,exports){
(function (global){(function (){
var hasMap = typeof Map === 'function' && Map.prototype;
var mapSizeDescriptor = Object.getOwnPropertyDescriptor && hasMap ? Object.getOwnPropertyDescriptor(Map.prototype, 'size') : null;
var mapSize = hasMap && mapSizeDescriptor && typeof mapSizeDescriptor.get === 'function' ? mapSizeDescriptor.get : null;
var mapForEach = hasMap && Map.prototype.forEach;
var hasSet = typeof Set === 'function' && Set.prototype;
var setSizeDescriptor = Object.getOwnPropertyDescriptor && hasSet ? Object.getOwnPropertyDescriptor(Set.prototype, 'size') : null;
var setSize = hasSet && setSizeDescriptor && typeof setSizeDescriptor.get === 'function' ? setSizeDescriptor.get : null;
var setForEach = hasSet && Set.prototype.forEach;
var hasWeakMap = typeof WeakMap === 'function' && WeakMap.prototype;
var weakMapHas = hasWeakMap ? WeakMap.prototype.has : null;
var hasWeakSet = typeof WeakSet === 'function' && WeakSet.prototype;
var weakSetHas = hasWeakSet ? WeakSet.prototype.has : null;
var hasWeakRef = typeof WeakRef === 'function' && WeakRef.prototype;
var weakRefDeref = hasWeakRef ? WeakRef.prototype.deref : null;
var booleanValueOf = Boolean.prototype.valueOf;
var objectToString = Object.prototype.toString;
var functionToString = Function.prototype.toString;
var $match = String.prototype.match;
var $slice = String.prototype.slice;
var $replace = String.prototype.replace;
var $toUpperCase = String.prototype.toUpperCase;
var $toLowerCase = String.prototype.toLowerCase;
var $test = RegExp.prototype.test;
var $concat = Array.prototype.concat;
var $join = Array.prototype.join;
var $arrSlice = Array.prototype.slice;
var $floor = Math.floor;
var bigIntValueOf = typeof BigInt === 'function' ? BigInt.prototype.valueOf : null;
var gOPS = Object.getOwnPropertySymbols;
var symToString = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol' ? Symbol.prototype.toString : null;
var hasShammedSymbols = typeof Symbol === 'function' && typeof Symbol.iterator === 'object';
// ie, `has-tostringtag/shams
var toStringTag = typeof Symbol === 'function' && Symbol.toStringTag && (typeof Symbol.toStringTag === hasShammedSymbols ? 'object' : 'symbol')
    ? Symbol.toStringTag
    : null;
var isEnumerable = Object.prototype.propertyIsEnumerable;

var gPO = (typeof Reflect === 'function' ? Reflect.getPrototypeOf : Object.getPrototypeOf) || (
    [].__proto__ === Array.prototype // eslint-disable-line no-proto
        ? function (O) {
            return O.__proto__; // eslint-disable-line no-proto
        }
        : null
);

function addNumericSeparator(num, str) {
    if (
        num === Infinity
        || num === -Infinity
        || num !== num
        || (num && num > -1000 && num < 1000)
        || $test.call(/e/, str)
    ) {
        return str;
    }
    var sepRegex = /[0-9](?=(?:[0-9]{3})+(?![0-9]))/g;
    if (typeof num === 'number') {
        var int = num < 0 ? -$floor(-num) : $floor(num); // trunc(num)
        if (int !== num) {
            var intStr = String(int);
            var dec = $slice.call(str, intStr.length + 1);
            return $replace.call(intStr, sepRegex, '$&_') + '.' + $replace.call($replace.call(dec, /([0-9]{3})/g, '$&_'), /_$/, '');
        }
    }
    return $replace.call(str, sepRegex, '$&_');
}

var utilInspect = require('./util.inspect');
var inspectCustom = utilInspect.custom;
var inspectSymbol = isSymbol(inspectCustom) ? inspectCustom : null;

module.exports = function inspect_(obj, options, depth, seen) {
    var opts = options || {};

    if (has(opts, 'quoteStyle') && (opts.quoteStyle !== 'single' && opts.quoteStyle !== 'double')) {
        throw new TypeError('option "quoteStyle" must be "single" or "double"');
    }
    if (
        has(opts, 'maxStringLength') && (typeof opts.maxStringLength === 'number'
            ? opts.maxStringLength < 0 && opts.maxStringLength !== Infinity
            : opts.maxStringLength !== null
        )
    ) {
        throw new TypeError('option "maxStringLength", if provided, must be a positive integer, Infinity, or `null`');
    }
    var customInspect = has(opts, 'customInspect') ? opts.customInspect : true;
    if (typeof customInspect !== 'boolean' && customInspect !== 'symbol') {
        throw new TypeError('option "customInspect", if provided, must be `true`, `false`, or `\'symbol\'`');
    }

    if (
        has(opts, 'indent')
        && opts.indent !== null
        && opts.indent !== '\t'
        && !(parseInt(opts.indent, 10) === opts.indent && opts.indent > 0)
    ) {
        throw new TypeError('option "indent" must be "\\t", an integer > 0, or `null`');
    }
    if (has(opts, 'numericSeparator') && typeof opts.numericSeparator !== 'boolean') {
        throw new TypeError('option "numericSeparator", if provided, must be `true` or `false`');
    }
    var numericSeparator = opts.numericSeparator;

    if (typeof obj === 'undefined') {
        return 'undefined';
    }
    if (obj === null) {
        return 'null';
    }
    if (typeof obj === 'boolean') {
        return obj ? 'true' : 'false';
    }

    if (typeof obj === 'string') {
        return inspectString(obj, opts);
    }
    if (typeof obj === 'number') {
        if (obj === 0) {
            return Infinity / obj > 0 ? '0' : '-0';
        }
        var str = String(obj);
        return numericSeparator ? addNumericSeparator(obj, str) : str;
    }
    if (typeof obj === 'bigint') {
        var bigIntStr = String(obj) + 'n';
        return numericSeparator ? addNumericSeparator(obj, bigIntStr) : bigIntStr;
    }

    var maxDepth = typeof opts.depth === 'undefined' ? 5 : opts.depth;
    if (typeof depth === 'undefined') { depth = 0; }
    if (depth >= maxDepth && maxDepth > 0 && typeof obj === 'object') {
        return isArray(obj) ? '[Array]' : '[Object]';
    }

    var indent = getIndent(opts, depth);

    if (typeof seen === 'undefined') {
        seen = [];
    } else if (indexOf(seen, obj) >= 0) {
        return '[Circular]';
    }

    function inspect(value, from, noIndent) {
        if (from) {
            seen = $arrSlice.call(seen);
            seen.push(from);
        }
        if (noIndent) {
            var newOpts = {
                depth: opts.depth
            };
            if (has(opts, 'quoteStyle')) {
                newOpts.quoteStyle = opts.quoteStyle;
            }
            return inspect_(value, newOpts, depth + 1, seen);
        }
        return inspect_(value, opts, depth + 1, seen);
    }

    if (typeof obj === 'function' && !isRegExp(obj)) { // in older engines, regexes are callable
        var name = nameOf(obj);
        var keys = arrObjKeys(obj, inspect);
        return '[Function' + (name ? ': ' + name : ' (anonymous)') + ']' + (keys.length > 0 ? ' { ' + $join.call(keys, ', ') + ' }' : '');
    }
    if (isSymbol(obj)) {
        var symString = hasShammedSymbols ? $replace.call(String(obj), /^(Symbol\(.*\))_[^)]*$/, '$1') : symToString.call(obj);
        return typeof obj === 'object' && !hasShammedSymbols ? markBoxed(symString) : symString;
    }
    if (isElement(obj)) {
        var s = '<' + $toLowerCase.call(String(obj.nodeName));
        var attrs = obj.attributes || [];
        for (var i = 0; i < attrs.length; i++) {
            s += ' ' + attrs[i].name + '=' + wrapQuotes(quote(attrs[i].value), 'double', opts);
        }
        s += '>';
        if (obj.childNodes && obj.childNodes.length) { s += '...'; }
        s += '</' + $toLowerCase.call(String(obj.nodeName)) + '>';
        return s;
    }
    if (isArray(obj)) {
        if (obj.length === 0) { return '[]'; }
        var xs = arrObjKeys(obj, inspect);
        if (indent && !singleLineValues(xs)) {
            return '[' + indentedJoin(xs, indent) + ']';
        }
        return '[ ' + $join.call(xs, ', ') + ' ]';
    }
    if (isError(obj)) {
        var parts = arrObjKeys(obj, inspect);
        if (!('cause' in Error.prototype) && 'cause' in obj && !isEnumerable.call(obj, 'cause')) {
            return '{ [' + String(obj) + '] ' + $join.call($concat.call('[cause]: ' + inspect(obj.cause), parts), ', ') + ' }';
        }
        if (parts.length === 0) { return '[' + String(obj) + ']'; }
        return '{ [' + String(obj) + '] ' + $join.call(parts, ', ') + ' }';
    }
    if (typeof obj === 'object' && customInspect) {
        if (inspectSymbol && typeof obj[inspectSymbol] === 'function' && utilInspect) {
            return utilInspect(obj, { depth: maxDepth - depth });
        } else if (customInspect !== 'symbol' && typeof obj.inspect === 'function') {
            return obj.inspect();
        }
    }
    if (isMap(obj)) {
        var mapParts = [];
        if (mapForEach) {
            mapForEach.call(obj, function (value, key) {
                mapParts.push(inspect(key, obj, true) + ' => ' + inspect(value, obj));
            });
        }
        return collectionOf('Map', mapSize.call(obj), mapParts, indent);
    }
    if (isSet(obj)) {
        var setParts = [];
        if (setForEach) {
            setForEach.call(obj, function (value) {
                setParts.push(inspect(value, obj));
            });
        }
        return collectionOf('Set', setSize.call(obj), setParts, indent);
    }
    if (isWeakMap(obj)) {
        return weakCollectionOf('WeakMap');
    }
    if (isWeakSet(obj)) {
        return weakCollectionOf('WeakSet');
    }
    if (isWeakRef(obj)) {
        return weakCollectionOf('WeakRef');
    }
    if (isNumber(obj)) {
        return markBoxed(inspect(Number(obj)));
    }
    if (isBigInt(obj)) {
        return markBoxed(inspect(bigIntValueOf.call(obj)));
    }
    if (isBoolean(obj)) {
        return markBoxed(booleanValueOf.call(obj));
    }
    if (isString(obj)) {
        return markBoxed(inspect(String(obj)));
    }
    // note: in IE 8, sometimes `global !== window` but both are the prototypes of each other
    /* eslint-env browser */
    if (typeof window !== 'undefined' && obj === window) {
        return '{ [object Window] }';
    }
    if (obj === global) {
        return '{ [object globalThis] }';
    }
    if (!isDate(obj) && !isRegExp(obj)) {
        var ys = arrObjKeys(obj, inspect);
        var isPlainObject = gPO ? gPO(obj) === Object.prototype : obj instanceof Object || obj.constructor === Object;
        var protoTag = obj instanceof Object ? '' : 'null prototype';
        var stringTag = !isPlainObject && toStringTag && Object(obj) === obj && toStringTag in obj ? $slice.call(toStr(obj), 8, -1) : protoTag ? 'Object' : '';
        var constructorTag = isPlainObject || typeof obj.constructor !== 'function' ? '' : obj.constructor.name ? obj.constructor.name + ' ' : '';
        var tag = constructorTag + (stringTag || protoTag ? '[' + $join.call($concat.call([], stringTag || [], protoTag || []), ': ') + '] ' : '');
        if (ys.length === 0) { return tag + '{}'; }
        if (indent) {
            return tag + '{' + indentedJoin(ys, indent) + '}';
        }
        return tag + '{ ' + $join.call(ys, ', ') + ' }';
    }
    return String(obj);
};

function wrapQuotes(s, defaultStyle, opts) {
    var quoteChar = (opts.quoteStyle || defaultStyle) === 'double' ? '"' : "'";
    return quoteChar + s + quoteChar;
}

function quote(s) {
    return $replace.call(String(s), /"/g, '&quot;');
}

function isArray(obj) { return toStr(obj) === '[object Array]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isDate(obj) { return toStr(obj) === '[object Date]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isRegExp(obj) { return toStr(obj) === '[object RegExp]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isError(obj) { return toStr(obj) === '[object Error]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isString(obj) { return toStr(obj) === '[object String]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isNumber(obj) { return toStr(obj) === '[object Number]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isBoolean(obj) { return toStr(obj) === '[object Boolean]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }

// Symbol and BigInt do have Symbol.toStringTag by spec, so that can't be used to eliminate false positives
function isSymbol(obj) {
    if (hasShammedSymbols) {
        return obj && typeof obj === 'object' && obj instanceof Symbol;
    }
    if (typeof obj === 'symbol') {
        return true;
    }
    if (!obj || typeof obj !== 'object' || !symToString) {
        return false;
    }
    try {
        symToString.call(obj);
        return true;
    } catch (e) {}
    return false;
}

function isBigInt(obj) {
    if (!obj || typeof obj !== 'object' || !bigIntValueOf) {
        return false;
    }
    try {
        bigIntValueOf.call(obj);
        return true;
    } catch (e) {}
    return false;
}

var hasOwn = Object.prototype.hasOwnProperty || function (key) { return key in this; };
function has(obj, key) {
    return hasOwn.call(obj, key);
}

function toStr(obj) {
    return objectToString.call(obj);
}

function nameOf(f) {
    if (f.name) { return f.name; }
    var m = $match.call(functionToString.call(f), /^function\s*([\w$]+)/);
    if (m) { return m[1]; }
    return null;
}

function indexOf(xs, x) {
    if (xs.indexOf) { return xs.indexOf(x); }
    for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x) { return i; }
    }
    return -1;
}

function isMap(x) {
    if (!mapSize || !x || typeof x !== 'object') {
        return false;
    }
    try {
        mapSize.call(x);
        try {
            setSize.call(x);
        } catch (s) {
            return true;
        }
        return x instanceof Map; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isWeakMap(x) {
    if (!weakMapHas || !x || typeof x !== 'object') {
        return false;
    }
    try {
        weakMapHas.call(x, weakMapHas);
        try {
            weakSetHas.call(x, weakSetHas);
        } catch (s) {
            return true;
        }
        return x instanceof WeakMap; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isWeakRef(x) {
    if (!weakRefDeref || !x || typeof x !== 'object') {
        return false;
    }
    try {
        weakRefDeref.call(x);
        return true;
    } catch (e) {}
    return false;
}

function isSet(x) {
    if (!setSize || !x || typeof x !== 'object') {
        return false;
    }
    try {
        setSize.call(x);
        try {
            mapSize.call(x);
        } catch (m) {
            return true;
        }
        return x instanceof Set; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isWeakSet(x) {
    if (!weakSetHas || !x || typeof x !== 'object') {
        return false;
    }
    try {
        weakSetHas.call(x, weakSetHas);
        try {
            weakMapHas.call(x, weakMapHas);
        } catch (s) {
            return true;
        }
        return x instanceof WeakSet; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isElement(x) {
    if (!x || typeof x !== 'object') { return false; }
    if (typeof HTMLElement !== 'undefined' && x instanceof HTMLElement) {
        return true;
    }
    return typeof x.nodeName === 'string' && typeof x.getAttribute === 'function';
}

function inspectString(str, opts) {
    if (str.length > opts.maxStringLength) {
        var remaining = str.length - opts.maxStringLength;
        var trailer = '... ' + remaining + ' more character' + (remaining > 1 ? 's' : '');
        return inspectString($slice.call(str, 0, opts.maxStringLength), opts) + trailer;
    }
    // eslint-disable-next-line no-control-regex
    var s = $replace.call($replace.call(str, /(['\\])/g, '\\$1'), /[\x00-\x1f]/g, lowbyte);
    return wrapQuotes(s, 'single', opts);
}

function lowbyte(c) {
    var n = c.charCodeAt(0);
    var x = {
        8: 'b',
        9: 't',
        10: 'n',
        12: 'f',
        13: 'r'
    }[n];
    if (x) { return '\\' + x; }
    return '\\x' + (n < 0x10 ? '0' : '') + $toUpperCase.call(n.toString(16));
}

function markBoxed(str) {
    return 'Object(' + str + ')';
}

function weakCollectionOf(type) {
    return type + ' { ? }';
}

function collectionOf(type, size, entries, indent) {
    var joinedEntries = indent ? indentedJoin(entries, indent) : $join.call(entries, ', ');
    return type + ' (' + size + ') {' + joinedEntries + '}';
}

function singleLineValues(xs) {
    for (var i = 0; i < xs.length; i++) {
        if (indexOf(xs[i], '\n') >= 0) {
            return false;
        }
    }
    return true;
}

function getIndent(opts, depth) {
    var baseIndent;
    if (opts.indent === '\t') {
        baseIndent = '\t';
    } else if (typeof opts.indent === 'number' && opts.indent > 0) {
        baseIndent = $join.call(Array(opts.indent + 1), ' ');
    } else {
        return null;
    }
    return {
        base: baseIndent,
        prev: $join.call(Array(depth + 1), baseIndent)
    };
}

function indentedJoin(xs, indent) {
    if (xs.length === 0) { return ''; }
    var lineJoiner = '\n' + indent.prev + indent.base;
    return lineJoiner + $join.call(xs, ',' + lineJoiner) + '\n' + indent.prev;
}

function arrObjKeys(obj, inspect) {
    var isArr = isArray(obj);
    var xs = [];
    if (isArr) {
        xs.length = obj.length;
        for (var i = 0; i < obj.length; i++) {
            xs[i] = has(obj, i) ? inspect(obj[i], obj) : '';
        }
    }
    var syms = typeof gOPS === 'function' ? gOPS(obj) : [];
    var symMap;
    if (hasShammedSymbols) {
        symMap = {};
        for (var k = 0; k < syms.length; k++) {
            symMap['$' + syms[k]] = syms[k];
        }
    }

    for (var key in obj) { // eslint-disable-line no-restricted-syntax
        if (!has(obj, key)) { continue; } // eslint-disable-line no-restricted-syntax, no-continue
        if (isArr && String(Number(key)) === key && key < obj.length) { continue; } // eslint-disable-line no-restricted-syntax, no-continue
        if (hasShammedSymbols && symMap['$' + key] instanceof Symbol) {
            // this is to prevent shammed Symbols, which are stored as strings, from being included in the string key section
            continue; // eslint-disable-line no-restricted-syntax, no-continue
        } else if ($test.call(/[^\w$]/, key)) {
            xs.push(inspect(key, obj) + ': ' + inspect(obj[key], obj));
        } else {
            xs.push(key + ': ' + inspect(obj[key], obj));
        }
    }
    if (typeof gOPS === 'function') {
        for (var j = 0; j < syms.length; j++) {
            if (isEnumerable.call(obj, syms[j])) {
                xs.push('[' + inspect(syms[j]) + ']: ' + inspect(obj[syms[j]], obj));
            }
        }
    }
    return xs;
}

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util.inspect":2}],328:[function(require,module,exports){
'use strict';

var replace = String.prototype.replace;
var percentTwenties = /%20/g;

var Format = {
    RFC1738: 'RFC1738',
    RFC3986: 'RFC3986'
};

module.exports = {
    'default': Format.RFC3986,
    formatters: {
        RFC1738: function (value) {
            return replace.call(value, percentTwenties, '+');
        },
        RFC3986: function (value) {
            return String(value);
        }
    },
    RFC1738: Format.RFC1738,
    RFC3986: Format.RFC3986
};

},{}],329:[function(require,module,exports){
'use strict';

var stringify = require('./stringify');
var parse = require('./parse');
var formats = require('./formats');

module.exports = {
    formats: formats,
    parse: parse,
    stringify: stringify
};

},{"./formats":328,"./parse":330,"./stringify":331}],330:[function(require,module,exports){
'use strict';

var utils = require('./utils');

var has = Object.prototype.hasOwnProperty;
var isArray = Array.isArray;

var defaults = {
    allowDots: false,
    allowPrototypes: false,
    allowSparse: false,
    arrayLimit: 20,
    charset: 'utf-8',
    charsetSentinel: false,
    comma: false,
    decoder: utils.decode,
    delimiter: '&',
    depth: 5,
    ignoreQueryPrefix: false,
    interpretNumericEntities: false,
    parameterLimit: 1000,
    parseArrays: true,
    plainObjects: false,
    strictNullHandling: false
};

var interpretNumericEntities = function (str) {
    return str.replace(/&#(\d+);/g, function ($0, numberStr) {
        return String.fromCharCode(parseInt(numberStr, 10));
    });
};

var parseArrayValue = function (val, options) {
    if (val && typeof val === 'string' && options.comma && val.indexOf(',') > -1) {
        return val.split(',');
    }

    return val;
};

// This is what browsers will submit when the ✓ character occurs in an
// application/x-www-form-urlencoded body and the encoding of the page containing
// the form is iso-8859-1, or when the submitted form has an accept-charset
// attribute of iso-8859-1. Presumably also with other charsets that do not contain
// the ✓ character, such as us-ascii.
var isoSentinel = 'utf8=%26%2310003%3B'; // encodeURIComponent('&#10003;')

// These are the percent-encoded utf-8 octets representing a checkmark, indicating that the request actually is utf-8 encoded.
var charsetSentinel = 'utf8=%E2%9C%93'; // encodeURIComponent('✓')

var parseValues = function parseQueryStringValues(str, options) {
    var obj = { __proto__: null };

    var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
    var limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
    var parts = cleanStr.split(options.delimiter, limit);
    var skipIndex = -1; // Keep track of where the utf8 sentinel was found
    var i;

    var charset = options.charset;
    if (options.charsetSentinel) {
        for (i = 0; i < parts.length; ++i) {
            if (parts[i].indexOf('utf8=') === 0) {
                if (parts[i] === charsetSentinel) {
                    charset = 'utf-8';
                } else if (parts[i] === isoSentinel) {
                    charset = 'iso-8859-1';
                }
                skipIndex = i;
                i = parts.length; // The eslint settings do not allow break;
            }
        }
    }

    for (i = 0; i < parts.length; ++i) {
        if (i === skipIndex) {
            continue;
        }
        var part = parts[i];

        var bracketEqualsPos = part.indexOf(']=');
        var pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;

        var key, val;
        if (pos === -1) {
            key = options.decoder(part, defaults.decoder, charset, 'key');
            val = options.strictNullHandling ? null : '';
        } else {
            key = options.decoder(part.slice(0, pos), defaults.decoder, charset, 'key');
            val = utils.maybeMap(
                parseArrayValue(part.slice(pos + 1), options),
                function (encodedVal) {
                    return options.decoder(encodedVal, defaults.decoder, charset, 'value');
                }
            );
        }

        if (val && options.interpretNumericEntities && charset === 'iso-8859-1') {
            val = interpretNumericEntities(val);
        }

        if (part.indexOf('[]=') > -1) {
            val = isArray(val) ? [val] : val;
        }

        if (has.call(obj, key)) {
            obj[key] = utils.combine(obj[key], val);
        } else {
            obj[key] = val;
        }
    }

    return obj;
};

var parseObject = function (chain, val, options, valuesParsed) {
    var leaf = valuesParsed ? val : parseArrayValue(val, options);

    for (var i = chain.length - 1; i >= 0; --i) {
        var obj;
        var root = chain[i];

        if (root === '[]' && options.parseArrays) {
            obj = [].concat(leaf);
        } else {
            obj = options.plainObjects ? Object.create(null) : {};
            var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
            var index = parseInt(cleanRoot, 10);
            if (!options.parseArrays && cleanRoot === '') {
                obj = { 0: leaf };
            } else if (
                !isNaN(index)
                && root !== cleanRoot
                && String(index) === cleanRoot
                && index >= 0
                && (options.parseArrays && index <= options.arrayLimit)
            ) {
                obj = [];
                obj[index] = leaf;
            } else if (cleanRoot !== '__proto__') {
                obj[cleanRoot] = leaf;
            }
        }

        leaf = obj;
    }

    return leaf;
};

var parseKeys = function parseQueryStringKeys(givenKey, val, options, valuesParsed) {
    if (!givenKey) {
        return;
    }

    // Transform dot notation to bracket notation
    var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

    // The regex chunks

    var brackets = /(\[[^[\]]*])/;
    var child = /(\[[^[\]]*])/g;

    // Get the parent

    var segment = options.depth > 0 && brackets.exec(key);
    var parent = segment ? key.slice(0, segment.index) : key;

    // Stash the parent if it exists

    var keys = [];
    if (parent) {
        // If we aren't using plain objects, optionally prefix keys that would overwrite object prototype properties
        if (!options.plainObjects && has.call(Object.prototype, parent)) {
            if (!options.allowPrototypes) {
                return;
            }
        }

        keys.push(parent);
    }

    // Loop through children appending to the array until we hit depth

    var i = 0;
    while (options.depth > 0 && (segment = child.exec(key)) !== null && i < options.depth) {
        i += 1;
        if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
            if (!options.allowPrototypes) {
                return;
            }
        }
        keys.push(segment[1]);
    }

    // If there's a remainder, just add whatever is left

    if (segment) {
        keys.push('[' + key.slice(segment.index) + ']');
    }

    return parseObject(keys, val, options, valuesParsed);
};

var normalizeParseOptions = function normalizeParseOptions(opts) {
    if (!opts) {
        return defaults;
    }

    if (opts.decoder !== null && opts.decoder !== undefined && typeof opts.decoder !== 'function') {
        throw new TypeError('Decoder has to be a function.');
    }

    if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
        throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
    }
    var charset = typeof opts.charset === 'undefined' ? defaults.charset : opts.charset;

    return {
        allowDots: typeof opts.allowDots === 'undefined' ? defaults.allowDots : !!opts.allowDots,
        allowPrototypes: typeof opts.allowPrototypes === 'boolean' ? opts.allowPrototypes : defaults.allowPrototypes,
        allowSparse: typeof opts.allowSparse === 'boolean' ? opts.allowSparse : defaults.allowSparse,
        arrayLimit: typeof opts.arrayLimit === 'number' ? opts.arrayLimit : defaults.arrayLimit,
        charset: charset,
        charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
        comma: typeof opts.comma === 'boolean' ? opts.comma : defaults.comma,
        decoder: typeof opts.decoder === 'function' ? opts.decoder : defaults.decoder,
        delimiter: typeof opts.delimiter === 'string' || utils.isRegExp(opts.delimiter) ? opts.delimiter : defaults.delimiter,
        // eslint-disable-next-line no-implicit-coercion, no-extra-parens
        depth: (typeof opts.depth === 'number' || opts.depth === false) ? +opts.depth : defaults.depth,
        ignoreQueryPrefix: opts.ignoreQueryPrefix === true,
        interpretNumericEntities: typeof opts.interpretNumericEntities === 'boolean' ? opts.interpretNumericEntities : defaults.interpretNumericEntities,
        parameterLimit: typeof opts.parameterLimit === 'number' ? opts.parameterLimit : defaults.parameterLimit,
        parseArrays: opts.parseArrays !== false,
        plainObjects: typeof opts.plainObjects === 'boolean' ? opts.plainObjects : defaults.plainObjects,
        strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling
    };
};

module.exports = function (str, opts) {
    var options = normalizeParseOptions(opts);

    if (str === '' || str === null || typeof str === 'undefined') {
        return options.plainObjects ? Object.create(null) : {};
    }

    var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
    var obj = options.plainObjects ? Object.create(null) : {};

    // Iterate over the keys and setup the new object

    var keys = Object.keys(tempObj);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var newObj = parseKeys(key, tempObj[key], options, typeof str === 'string');
        obj = utils.merge(obj, newObj, options);
    }

    if (options.allowSparse === true) {
        return obj;
    }

    return utils.compact(obj);
};

},{"./utils":332}],331:[function(require,module,exports){
'use strict';

var getSideChannel = require('side-channel');
var utils = require('./utils');
var formats = require('./formats');
var has = Object.prototype.hasOwnProperty;

var arrayPrefixGenerators = {
    brackets: function brackets(prefix) {
        return prefix + '[]';
    },
    comma: 'comma',
    indices: function indices(prefix, key) {
        return prefix + '[' + key + ']';
    },
    repeat: function repeat(prefix) {
        return prefix;
    }
};

var isArray = Array.isArray;
var push = Array.prototype.push;
var pushToArray = function (arr, valueOrArray) {
    push.apply(arr, isArray(valueOrArray) ? valueOrArray : [valueOrArray]);
};

var toISO = Date.prototype.toISOString;

var defaultFormat = formats['default'];
var defaults = {
    addQueryPrefix: false,
    allowDots: false,
    charset: 'utf-8',
    charsetSentinel: false,
    delimiter: '&',
    encode: true,
    encoder: utils.encode,
    encodeValuesOnly: false,
    format: defaultFormat,
    formatter: formats.formatters[defaultFormat],
    // deprecated
    indices: false,
    serializeDate: function serializeDate(date) {
        return toISO.call(date);
    },
    skipNulls: false,
    strictNullHandling: false
};

var isNonNullishPrimitive = function isNonNullishPrimitive(v) {
    return typeof v === 'string'
        || typeof v === 'number'
        || typeof v === 'boolean'
        || typeof v === 'symbol'
        || typeof v === 'bigint';
};

var sentinel = {};

var stringify = function stringify(
    object,
    prefix,
    generateArrayPrefix,
    commaRoundTrip,
    strictNullHandling,
    skipNulls,
    encoder,
    filter,
    sort,
    allowDots,
    serializeDate,
    format,
    formatter,
    encodeValuesOnly,
    charset,
    sideChannel
) {
    var obj = object;

    var tmpSc = sideChannel;
    var step = 0;
    var findFlag = false;
    while ((tmpSc = tmpSc.get(sentinel)) !== void undefined && !findFlag) {
        // Where object last appeared in the ref tree
        var pos = tmpSc.get(object);
        step += 1;
        if (typeof pos !== 'undefined') {
            if (pos === step) {
                throw new RangeError('Cyclic object value');
            } else {
                findFlag = true; // Break while
            }
        }
        if (typeof tmpSc.get(sentinel) === 'undefined') {
            step = 0;
        }
    }

    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    } else if (obj instanceof Date) {
        obj = serializeDate(obj);
    } else if (generateArrayPrefix === 'comma' && isArray(obj)) {
        obj = utils.maybeMap(obj, function (value) {
            if (value instanceof Date) {
                return serializeDate(value);
            }
            return value;
        });
    }

    if (obj === null) {
        if (strictNullHandling) {
            return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset, 'key', format) : prefix;
        }

        obj = '';
    }

    if (isNonNullishPrimitive(obj) || utils.isBuffer(obj)) {
        if (encoder) {
            var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, 'key', format);
            return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder, charset, 'value', format))];
        }
        return [formatter(prefix) + '=' + formatter(String(obj))];
    }

    var values = [];

    if (typeof obj === 'undefined') {
        return values;
    }

    var objKeys;
    if (generateArrayPrefix === 'comma' && isArray(obj)) {
        // we need to join elements in
        if (encodeValuesOnly && encoder) {
            obj = utils.maybeMap(obj, encoder);
        }
        objKeys = [{ value: obj.length > 0 ? obj.join(',') || null : void undefined }];
    } else if (isArray(filter)) {
        objKeys = filter;
    } else {
        var keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
    }

    var adjustedPrefix = commaRoundTrip && isArray(obj) && obj.length === 1 ? prefix + '[]' : prefix;

    for (var j = 0; j < objKeys.length; ++j) {
        var key = objKeys[j];
        var value = typeof key === 'object' && typeof key.value !== 'undefined' ? key.value : obj[key];

        if (skipNulls && value === null) {
            continue;
        }

        var keyPrefix = isArray(obj)
            ? typeof generateArrayPrefix === 'function' ? generateArrayPrefix(adjustedPrefix, key) : adjustedPrefix
            : adjustedPrefix + (allowDots ? '.' + key : '[' + key + ']');

        sideChannel.set(object, step);
        var valueSideChannel = getSideChannel();
        valueSideChannel.set(sentinel, sideChannel);
        pushToArray(values, stringify(
            value,
            keyPrefix,
            generateArrayPrefix,
            commaRoundTrip,
            strictNullHandling,
            skipNulls,
            generateArrayPrefix === 'comma' && encodeValuesOnly && isArray(obj) ? null : encoder,
            filter,
            sort,
            allowDots,
            serializeDate,
            format,
            formatter,
            encodeValuesOnly,
            charset,
            valueSideChannel
        ));
    }

    return values;
};

var normalizeStringifyOptions = function normalizeStringifyOptions(opts) {
    if (!opts) {
        return defaults;
    }

    if (opts.encoder !== null && typeof opts.encoder !== 'undefined' && typeof opts.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }

    var charset = opts.charset || defaults.charset;
    if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
        throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
    }

    var format = formats['default'];
    if (typeof opts.format !== 'undefined') {
        if (!has.call(formats.formatters, opts.format)) {
            throw new TypeError('Unknown format option provided.');
        }
        format = opts.format;
    }
    var formatter = formats.formatters[format];

    var filter = defaults.filter;
    if (typeof opts.filter === 'function' || isArray(opts.filter)) {
        filter = opts.filter;
    }

    return {
        addQueryPrefix: typeof opts.addQueryPrefix === 'boolean' ? opts.addQueryPrefix : defaults.addQueryPrefix,
        allowDots: typeof opts.allowDots === 'undefined' ? defaults.allowDots : !!opts.allowDots,
        charset: charset,
        charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
        delimiter: typeof opts.delimiter === 'undefined' ? defaults.delimiter : opts.delimiter,
        encode: typeof opts.encode === 'boolean' ? opts.encode : defaults.encode,
        encoder: typeof opts.encoder === 'function' ? opts.encoder : defaults.encoder,
        encodeValuesOnly: typeof opts.encodeValuesOnly === 'boolean' ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
        filter: filter,
        format: format,
        formatter: formatter,
        serializeDate: typeof opts.serializeDate === 'function' ? opts.serializeDate : defaults.serializeDate,
        skipNulls: typeof opts.skipNulls === 'boolean' ? opts.skipNulls : defaults.skipNulls,
        sort: typeof opts.sort === 'function' ? opts.sort : null,
        strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling
    };
};

module.exports = function (object, opts) {
    var obj = object;
    var options = normalizeStringifyOptions(opts);

    var objKeys;
    var filter;

    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    } else if (isArray(options.filter)) {
        filter = options.filter;
        objKeys = filter;
    }

    var keys = [];

    if (typeof obj !== 'object' || obj === null) {
        return '';
    }

    var arrayFormat;
    if (opts && opts.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = opts.arrayFormat;
    } else if (opts && 'indices' in opts) {
        arrayFormat = opts.indices ? 'indices' : 'repeat';
    } else {
        arrayFormat = 'indices';
    }

    var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];
    if (opts && 'commaRoundTrip' in opts && typeof opts.commaRoundTrip !== 'boolean') {
        throw new TypeError('`commaRoundTrip` must be a boolean, or absent');
    }
    var commaRoundTrip = generateArrayPrefix === 'comma' && opts && opts.commaRoundTrip;

    if (!objKeys) {
        objKeys = Object.keys(obj);
    }

    if (options.sort) {
        objKeys.sort(options.sort);
    }

    var sideChannel = getSideChannel();
    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (options.skipNulls && obj[key] === null) {
            continue;
        }
        pushToArray(keys, stringify(
            obj[key],
            key,
            generateArrayPrefix,
            commaRoundTrip,
            options.strictNullHandling,
            options.skipNulls,
            options.encode ? options.encoder : null,
            options.filter,
            options.sort,
            options.allowDots,
            options.serializeDate,
            options.format,
            options.formatter,
            options.encodeValuesOnly,
            options.charset,
            sideChannel
        ));
    }

    var joined = keys.join(options.delimiter);
    var prefix = options.addQueryPrefix === true ? '?' : '';

    if (options.charsetSentinel) {
        if (options.charset === 'iso-8859-1') {
            // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
            prefix += 'utf8=%26%2310003%3B&';
        } else {
            // encodeURIComponent('✓')
            prefix += 'utf8=%E2%9C%93&';
        }
    }

    return joined.length > 0 ? prefix + joined : '';
};

},{"./formats":328,"./utils":332,"side-channel":334}],332:[function(require,module,exports){
'use strict';

var formats = require('./formats');

var has = Object.prototype.hasOwnProperty;
var isArray = Array.isArray;

var hexTable = (function () {
    var array = [];
    for (var i = 0; i < 256; ++i) {
        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
    }

    return array;
}());

var compactQueue = function compactQueue(queue) {
    while (queue.length > 1) {
        var item = queue.pop();
        var obj = item.obj[item.prop];

        if (isArray(obj)) {
            var compacted = [];

            for (var j = 0; j < obj.length; ++j) {
                if (typeof obj[j] !== 'undefined') {
                    compacted.push(obj[j]);
                }
            }

            item.obj[item.prop] = compacted;
        }
    }
};

var arrayToObject = function arrayToObject(source, options) {
    var obj = options && options.plainObjects ? Object.create(null) : {};
    for (var i = 0; i < source.length; ++i) {
        if (typeof source[i] !== 'undefined') {
            obj[i] = source[i];
        }
    }

    return obj;
};

var merge = function merge(target, source, options) {
    /* eslint no-param-reassign: 0 */
    if (!source) {
        return target;
    }

    if (typeof source !== 'object') {
        if (isArray(target)) {
            target.push(source);
        } else if (target && typeof target === 'object') {
            if ((options && (options.plainObjects || options.allowPrototypes)) || !has.call(Object.prototype, source)) {
                target[source] = true;
            }
        } else {
            return [target, source];
        }

        return target;
    }

    if (!target || typeof target !== 'object') {
        return [target].concat(source);
    }

    var mergeTarget = target;
    if (isArray(target) && !isArray(source)) {
        mergeTarget = arrayToObject(target, options);
    }

    if (isArray(target) && isArray(source)) {
        source.forEach(function (item, i) {
            if (has.call(target, i)) {
                var targetItem = target[i];
                if (targetItem && typeof targetItem === 'object' && item && typeof item === 'object') {
                    target[i] = merge(targetItem, item, options);
                } else {
                    target.push(item);
                }
            } else {
                target[i] = item;
            }
        });
        return target;
    }

    return Object.keys(source).reduce(function (acc, key) {
        var value = source[key];

        if (has.call(acc, key)) {
            acc[key] = merge(acc[key], value, options);
        } else {
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
};

var assign = function assignSingleSource(target, source) {
    return Object.keys(source).reduce(function (acc, key) {
        acc[key] = source[key];
        return acc;
    }, target);
};

var decode = function (str, decoder, charset) {
    var strWithoutPlus = str.replace(/\+/g, ' ');
    if (charset === 'iso-8859-1') {
        // unescape never throws, no try...catch needed:
        return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
    }
    // utf-8
    try {
        return decodeURIComponent(strWithoutPlus);
    } catch (e) {
        return strWithoutPlus;
    }
};

var encode = function encode(str, defaultEncoder, charset, kind, format) {
    // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }

    var string = str;
    if (typeof str === 'symbol') {
        string = Symbol.prototype.toString.call(str);
    } else if (typeof str !== 'string') {
        string = String(str);
    }

    if (charset === 'iso-8859-1') {
        return escape(string).replace(/%u[0-9a-f]{4}/gi, function ($0) {
            return '%26%23' + parseInt($0.slice(2), 16) + '%3B';
        });
    }

    var out = '';
    for (var i = 0; i < string.length; ++i) {
        var c = string.charCodeAt(i);

        if (
            c === 0x2D // -
            || c === 0x2E // .
            || c === 0x5F // _
            || c === 0x7E // ~
            || (c >= 0x30 && c <= 0x39) // 0-9
            || (c >= 0x41 && c <= 0x5A) // a-z
            || (c >= 0x61 && c <= 0x7A) // A-Z
            || (format === formats.RFC1738 && (c === 0x28 || c === 0x29)) // ( )
        ) {
            out += string.charAt(i);
            continue;
        }

        if (c < 0x80) {
            out = out + hexTable[c];
            continue;
        }

        if (c < 0x800) {
            out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        if (c < 0xD800 || c >= 0xE000) {
            out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        i += 1;
        c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
        /* eslint operator-linebreak: [2, "before"] */
        out += hexTable[0xF0 | (c >> 18)]
            + hexTable[0x80 | ((c >> 12) & 0x3F)]
            + hexTable[0x80 | ((c >> 6) & 0x3F)]
            + hexTable[0x80 | (c & 0x3F)];
    }

    return out;
};

var compact = function compact(value) {
    var queue = [{ obj: { o: value }, prop: 'o' }];
    var refs = [];

    for (var i = 0; i < queue.length; ++i) {
        var item = queue[i];
        var obj = item.obj[item.prop];

        var keys = Object.keys(obj);
        for (var j = 0; j < keys.length; ++j) {
            var key = keys[j];
            var val = obj[key];
            if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                queue.push({ obj: obj, prop: key });
                refs.push(val);
            }
        }
    }

    compactQueue(queue);

    return value;
};

var isRegExp = function isRegExp(obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
};

var isBuffer = function isBuffer(obj) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
};

var combine = function combine(a, b) {
    return [].concat(a, b);
};

var maybeMap = function maybeMap(val, fn) {
    if (isArray(val)) {
        var mapped = [];
        for (var i = 0; i < val.length; i += 1) {
            mapped.push(fn(val[i]));
        }
        return mapped;
    }
    return fn(val);
};

module.exports = {
    arrayToObject: arrayToObject,
    assign: assign,
    combine: combine,
    compact: compact,
    decode: decode,
    encode: encode,
    isBuffer: isBuffer,
    isRegExp: isRegExp,
    maybeMap: maybeMap,
    merge: merge
};

},{"./formats":328}],333:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');
var define = require('define-data-property');
var hasDescriptors = require('has-property-descriptors')();
var gOPD = require('gopd');

var $TypeError = GetIntrinsic('%TypeError%');
var $floor = GetIntrinsic('%Math.floor%');

/** @typedef {(...args: unknown[]) => unknown} Func */

/** @type {<T extends Func = Func>(fn: T, length: number, loose?: boolean) => T} */
module.exports = function setFunctionLength(fn, length) {
	if (typeof fn !== 'function') {
		throw new $TypeError('`fn` is not a function');
	}
	if (typeof length !== 'number' || length < 0 || length > 0xFFFFFFFF || $floor(length) !== length) {
		throw new $TypeError('`length` must be a positive 32-bit integer');
	}

	var loose = arguments.length > 2 && !!arguments[2];

	var functionLengthIsConfigurable = true;
	var functionLengthIsWritable = true;
	if ('length' in fn && gOPD) {
		var desc = gOPD(fn, 'length');
		if (desc && !desc.configurable) {
			functionLengthIsConfigurable = false;
		}
		if (desc && !desc.writable) {
			functionLengthIsWritable = false;
		}
	}

	if (functionLengthIsConfigurable || functionLengthIsWritable || !loose) {
		if (hasDescriptors) {
			define(/** @type {Parameters<define>[0]} */ (fn), 'length', length, true, true);
		} else {
			define(/** @type {Parameters<define>[0]} */ (fn), 'length', length);
		}
	}
	return fn;
};

},{"define-data-property":314,"get-intrinsic":318,"gopd":319,"has-property-descriptors":320}],334:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');
var callBound = require('call-bind/callBound');
var inspect = require('object-inspect');

var $TypeError = GetIntrinsic('%TypeError%');
var $WeakMap = GetIntrinsic('%WeakMap%', true);
var $Map = GetIntrinsic('%Map%', true);

var $weakMapGet = callBound('WeakMap.prototype.get', true);
var $weakMapSet = callBound('WeakMap.prototype.set', true);
var $weakMapHas = callBound('WeakMap.prototype.has', true);
var $mapGet = callBound('Map.prototype.get', true);
var $mapSet = callBound('Map.prototype.set', true);
var $mapHas = callBound('Map.prototype.has', true);

/*
 * This function traverses the list returning the node corresponding to the
 * given key.
 *
 * That node is also moved to the head of the list, so that if it's accessed
 * again we don't need to traverse the whole list. By doing so, all the recently
 * used nodes can be accessed relatively quickly.
 */
var listGetNode = function (list, key) { // eslint-disable-line consistent-return
	for (var prev = list, curr; (curr = prev.next) !== null; prev = curr) {
		if (curr.key === key) {
			prev.next = curr.next;
			curr.next = list.next;
			list.next = curr; // eslint-disable-line no-param-reassign
			return curr;
		}
	}
};

var listGet = function (objects, key) {
	var node = listGetNode(objects, key);
	return node && node.value;
};
var listSet = function (objects, key, value) {
	var node = listGetNode(objects, key);
	if (node) {
		node.value = value;
	} else {
		// Prepend the new node to the beginning of the list
		objects.next = { // eslint-disable-line no-param-reassign
			key: key,
			next: objects.next,
			value: value
		};
	}
};
var listHas = function (objects, key) {
	return !!listGetNode(objects, key);
};

module.exports = function getSideChannel() {
	var $wm;
	var $m;
	var $o;
	var channel = {
		assert: function (key) {
			if (!channel.has(key)) {
				throw new $TypeError('Side channel does not contain ' + inspect(key));
			}
		},
		get: function (key) { // eslint-disable-line consistent-return
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if ($wm) {
					return $weakMapGet($wm, key);
				}
			} else if ($Map) {
				if ($m) {
					return $mapGet($m, key);
				}
			} else {
				if ($o) { // eslint-disable-line no-lonely-if
					return listGet($o, key);
				}
			}
		},
		has: function (key) {
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if ($wm) {
					return $weakMapHas($wm, key);
				}
			} else if ($Map) {
				if ($m) {
					return $mapHas($m, key);
				}
			} else {
				if ($o) { // eslint-disable-line no-lonely-if
					return listHas($o, key);
				}
			}
			return false;
		},
		set: function (key, value) {
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if (!$wm) {
					$wm = new $WeakMap();
				}
				$weakMapSet($wm, key, value);
			} else if ($Map) {
				if (!$m) {
					$m = new $Map();
				}
				$mapSet($m, key, value);
			} else {
				if (!$o) {
					/*
					 * Initialize the linked list as an empty node, so that we don't have
					 * to special-case handling of the first node: we can always refer to
					 * it as (previous node).next, instead of something like (list).head
					 */
					$o = { key: {}, next: null };
				}
				listSet($o, key, value);
			}
		}
	};
	return channel;
};

},{"call-bind/callBound":9,"get-intrinsic":318,"object-inspect":327}],335:[function(require,module,exports){
(function (name, context, definition) {
  if (typeof module !== 'undefined' && module.exports) module.exports = definition();
  else if (typeof define === 'function' && define.amd) define(definition);
  else context[name] = definition();
})('urljoin', this, function () {

  function normalize (strArray) {
    var resultArray = [];
    if (strArray.length === 0) { return ''; }

    if (typeof strArray[0] !== 'string') {
      throw new TypeError('Url must be a string. Received ' + strArray[0]);
    }

    // If the first part is a plain protocol, we combine it with the next part.
    if (strArray[0].match(/^[^/:]+:\/*$/) && strArray.length > 1) {
      var first = strArray.shift();
      strArray[0] = first + strArray[0];
    }

    // There must be two or three slashes in the file protocol, two slashes in anything else.
    if (strArray[0].match(/^file:\/\/\//)) {
      strArray[0] = strArray[0].replace(/^([^/:]+):\/*/, '$1:///');
    } else {
      strArray[0] = strArray[0].replace(/^([^/:]+):\/*/, '$1://');
    }

    for (var i = 0; i < strArray.length; i++) {
      var component = strArray[i];

      if (typeof component !== 'string') {
        throw new TypeError('Url must be a string. Received ' + component);
      }

      if (component === '') { continue; }

      if (i > 0) {
        // Removing the starting slashes for each component but the first.
        component = component.replace(/^[\/]+/, '');
      }
      if (i < strArray.length - 1) {
        // Removing the ending slashes for each component but the last.
        component = component.replace(/[\/]+$/, '');
      } else {
        // For the last component we will combine multiple slashes to a single one.
        component = component.replace(/[\/]+$/, '/');
      }

      resultArray.push(component);

    }

    var str = resultArray.join('/');
    // Each input component is now separated by a single slash except the possible first plain protocol part.

    // remove trailing slash before parameters or hash
    str = str.replace(/\/(\?|&|#[^!])/g, '$1');

    // replace ? in parameters with &
    var parts = str.split('?');
    str = parts.shift() + (parts.length > 0 ? '?': '') + parts.join('&');

    return str;
  }

  return function () {
    var input;

    if (typeof arguments[0] === 'object') {
      input = arguments[0];
    } else {
      input = [].slice.call(arguments);
    }

    return normalize(input);
  };

});

},{}]},{},[8]);
