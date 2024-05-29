// COPIED FROM https://github.com/sipa/bech32/blob/master/ref/javascript/bech32.js
// AND https://github.com/sipa/bech32/blob/master/ref/javascript/segwit_addr.js

// Copyright (c) 2017, 2021 Pieter Wuille
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
var GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

const encodings = {
  BECH32: "bech32",
  BECH32M: "bech32m",
};

exports.getEncodingConst = (enc) => {
  if (enc == encodings.BECH32) {
    return 1;
  } else if (enc == encodings.BECH32M) {
    return 0x2bc830a3;
  } else {
    return null;
  }
}

exports.polymod = (values) => {
  var chk = 1;
  for (var p = 0; p < values.length; ++p) {
    var top = chk >> 25;
    chk = (chk & 0x1ffffff) << 5 ^ values[p];
    for (var i = 0; i < 5; ++i) {
      if ((top >> i) & 1) {
        chk ^= GENERATOR[i];
      }
    }
  }
  return chk;
}

exports.hrpExpand = (humanReadablePrefix) => {
  var ret = [];
  var p;
  for (p = 0; p < humanReadablePrefix.length; ++p) {
    ret.push(humanReadablePrefix.charCodeAt(p) >> 5);
  }
  ret.push(0);
  for (p = 0; p < humanReadablePrefix.length; ++p) {
    ret.push(humanReadablePrefix.charCodeAt(p) & 31);
  }
  return ret;
}

exports.verifyChecksum = (humanReadablePrefix, data, enc) => {
  return exports.polymod(exports.hrpExpand(humanReadablePrefix).concat(data)) === exports.getEncodingConst(enc);
}

exports.createChecksum = (humanReadablePrefix, data, enc) => {
  var values = exports.hrpExpand(humanReadablePrefix).concat(data).concat([0, 0, 0, 0, 0, 0]);
  var mod = exports.polymod(values) ^ exports.getEncodingConst(enc);
  var ret = [];
  for (var p = 0; p < 6; ++p) {
    ret.push((mod >> 5 * (5 - p)) & 31);
  }
  return ret;
}

exports.bech32_encode = (humanReadablePrefix, data, enc) => {
  var combined = data.concat(exports.createChecksum(humanReadablePrefix, data, enc));
  var ret = humanReadablePrefix + '1';
  for (var p = 0; p < combined.length; ++p) {
    ret += CHARSET.charAt(combined[p]);
  }
  return ret;
}

exports.bech32_decode = (bechString, enc) => {
  var p;
  var has_lower = false;
  var has_upper = false;
  for (p = 0; p < bechString.length; ++p) {
    if (bechString.charCodeAt(p) < 33 || bechString.charCodeAt(p) > 126) {
      return null;
    }
    if (bechString.charCodeAt(p) >= 97 && bechString.charCodeAt(p) <= 122) {
        has_lower = true;
    }
    if (bechString.charCodeAt(p) >= 65 && bechString.charCodeAt(p) <= 90) {
        has_upper = true;
    }
  }
  if (has_lower && has_upper) {
    return null;
  }
  bechString = bechString.toLowerCase();
  var pos = bechString.lastIndexOf('1');
  if (pos < 1 || pos + 7 > bechString.length || bechString.length > 90) {
    return null;
  }
  var humanReadablePrefix = bechString.substring(0, pos);
  var data = [];
  for (p = pos + 1; p < bechString.length; ++p) {
    var d = CHARSET.indexOf(bechString.charAt(p));
    if (d === -1) {
      return null;
    }
    data.push(d);
  }
  if (!exports.verifyChecksum(humanReadablePrefix, data, enc)) {
    return null;
  }
  return {hrp: humanReadablePrefix, data: data.slice(0, data.length - 6)};
}


exports.convertbits = (data, frombits, tobits, pad) => {
  var acc = 0;
  var bits = 0;
  var ret = [];
  var maxv = (1 << tobits) - 1;
  for (var p = 0; p < data.length; ++p) {
    var value = data[p];
    if (value < 0 || (value >> frombits) !== 0) {
      return null;
    }
    acc = (acc << frombits) | value;
    bits += frombits;
    while (bits >= tobits) {
      bits -= tobits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push((acc << (tobits - bits)) & maxv);
    }
  } else if (bits >= frombits || ((acc << (tobits - bits)) & maxv)) {
    return null;
  }
  return ret;
}

exports.decode = (humanReadablePrefix, addr) => {
  var bech32m = false;
  var dec = exports.bech32_decode(addr, encodings.BECH32);
  if (dec === null) {
    dec = exports.bech32_decode(addr, encodings.BECH32M);
    bech32m = true;
  }
  if (dec === null || dec.hrp !== humanReadablePrefix || dec.data.length < 1 || dec.data[0] > 16) {
    return null;
  }
  var res = exports.convertbits(dec.data.slice(1), 5, 8, false);
  if (res === null || res.length < 2 || res.length > 40) {
    return null;
  }
  if (dec.data[0] === 0 && res.length !== 20 && res.length !== 32) {
    return null;
  }
  if (dec.data[0] === 0 && bech32m) {
    return null;
  }
  if (dec.data[0] !== 0 && !bech32m) {
    return null;
  }
  return {version: dec.data[0], program: res};
}

exports.encode = (humanReadablePrefix, version, program) => {
  var enc = encodings.BECH32;
  if (version > 0) {
    enc = encodings.BECH32M;
  }
  var ret = exports.bech32_encode(humanReadablePrefix, [version].concat(exports.convertbits(program, 8, 5, true)), enc);
  if (exports.decode(humanReadablePrefix, ret) === null) {
    return null;
  }
  return ret;
}