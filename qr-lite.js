/* MAHFITT QR encoder
   Fixed Version 4-L QR codes are enough for the signed-in check-in URL while
   keeping the member popup instant and dependency-free. The scanner accepts
   the same ordinary URL, so the iPhone Camera app remains a universal backup. */
(function (global) {
  'use strict';

  var VERSION = 4, SIZE = 33, DATA_CODEWORDS = 80, EC_CODEWORDS = 20;
  var EXP = new Array(512), LOG = new Array(256);
  (function makeField() {
    var x = 1, i;
    for (i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1; if (x & 0x100) x ^= 0x11d;
    }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  }());

  function mul(a, b) { return (!a || !b) ? 0 : EXP[LOG[a] + LOG[b]]; }
  function generator(degree) {
    var out = [1], i, j, next;
    for (i = 0; i < degree; i++) {
      next = new Array(out.length + 1).fill(0);
      for (j = 0; j < out.length; j++) {
        next[j] ^= out[j];
        next[j + 1] ^= mul(out[j], EXP[i]);
      }
      out = next;
    }
    return out;
  }
  var RS_GENERATOR = generator(EC_CODEWORDS);

  function errorCorrection(data) {
    var work = data.concat(new Array(EC_CODEWORDS).fill(0)), i, j, factor;
    for (i = 0; i < data.length; i++) {
      factor = work[i];
      if (!factor) continue;
      for (j = 0; j < RS_GENERATOR.length; j++) work[i + j] ^= mul(RS_GENERATOR[j], factor);
    }
    return work.slice(data.length);
  }

  function pushBits(bits, value, count) {
    for (var i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  }
  function dataCodewords(text) {
    var bytes = Array.prototype.slice.call(new TextEncoder().encode(String(text || '')));
    if (bytes.length > 78) throw new Error('Check-in QR payload is too long.');
    var bits = [];
    pushBits(bits, 4, 4);                 // byte mode
    pushBits(bits, bytes.length, 8);      // versions 1-9 use an 8-bit count
    bytes.forEach(function (b) { pushBits(bits, b, 8); });
    var capacity = DATA_CODEWORDS * 8;
    pushBits(bits, 0, Math.min(4, capacity - bits.length));
    while (bits.length % 8) bits.push(0);
    var data = [], i, value;
    for (i = 0; i < bits.length; i += 8) {
      value = 0;
      for (var j = 0; j < 8; j++) value = (value << 1) | bits[i + j];
      data.push(value);
    }
    for (i = 0; data.length < DATA_CODEWORDS; i++) data.push(i % 2 ? 0x11 : 0xec);
    return data;
  }

  function bitLength(n) { var d = 0; while (n) { d++; n >>>= 1; } return d; }
  function formatBits(mask) {
    var data = (1 << 3) | mask;           // error correction level L = 01
    var value = data << 10, generatorValue = 0x537;
    while (bitLength(value) >= bitLength(generatorValue)) {
      value ^= generatorValue << (bitLength(value) - bitLength(generatorValue));
    }
    return ((data << 10) | value) ^ 0x5412;
  }

  function matrix(text) {
    var modules = Array.from({ length: SIZE }, function () { return new Array(SIZE).fill(false); });
    var reserved = Array.from({ length: SIZE }, function () { return new Array(SIZE).fill(false); });
    function set(row, col, dark) {
      if (row < 0 || col < 0 || row >= SIZE || col >= SIZE) return;
      modules[row][col] = !!dark; reserved[row][col] = true;
    }
    function finder(row, col) {
      for (var r = -1; r <= 7; r++) for (var c = -1; c <= 7; c++) {
        var inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        var dark = inside && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        set(row + r, col + c, dark);
      }
    }
    function alignment(centerRow, centerCol) {
      for (var r = -2; r <= 2; r++) for (var c = -2; c <= 2; c++) {
        set(centerRow + r, centerCol + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
      }
    }
    function placeFormat(mask) {
      var bits = formatBits(mask), i, dark, row, col;
      for (i = 0; i < 15; i++) {
        dark = ((bits >>> i) & 1) === 1;
        row = i < 6 ? i : i < 8 ? i + 1 : SIZE - 15 + i;
        set(row, 8, dark);
        if (i < 8) col = SIZE - i - 1;
        else if (i < 9) col = 15 - i;
        else col = 14 - i;
        set(8, col, dark);
      }
      set(SIZE - 8, 8, true);
    }

    finder(0, 0); finder(0, SIZE - 7); finder(SIZE - 7, 0);
    for (var i = 8; i < SIZE - 8; i++) {
      if (!reserved[6][i]) set(6, i, i % 2 === 0);
      if (!reserved[i][6]) set(i, 6, i % 2 === 0);
    }
    alignment(26, 26);
    placeFormat(0);                       // reserves both format tracks

    var words = dataCodewords(text), ec = errorCorrection(words), stream = [];
    words.concat(ec).forEach(function (word) { pushBits(stream, word, 8); });
    var bit = 0, upward = true;
    for (var right = SIZE - 1; right > 0; right -= 2) {
      if (right === 6) right--;
      for (var step = 0; step < SIZE; step++) {
        var rr = upward ? SIZE - 1 - step : step;
        for (var side = 0; side < 2; side++) {
          var cc = right - side;
          if (reserved[rr][cc]) continue;
          var raw = bit < stream.length ? stream[bit++] : 0;
          modules[rr][cc] = !!(raw ^ (((rr + cc) & 1) === 0 ? 1 : 0)); // mask 0
        }
      }
      upward = !upward;
    }
    placeFormat(0);
    return modules;
  }

  function svg(text, options) {
    options = options || {};
    var modules = matrix(text), quiet = 4, total = SIZE + quiet * 2, path = [];
    var dark = /^#[0-9a-f]{3,8}$/i.test(String(options.dark || '')) ? options.dark : '#0b0e12';
    var light = /^#[0-9a-f]{3,8}$/i.test(String(options.light || '')) ? options.light : '#fff';
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) {
      if (modules[r][c]) path.push('M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z');
    }
    var label = String(options.label || 'Member check-in QR code').replace(/[&<>"']/g, function (ch) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
    });
    return '<svg class="mah-qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" role="img" aria-label="' + label + '" shape-rendering="crispEdges">'
      + '<rect width="' + total + '" height="' + total + '" fill="' + light + '"/>'
      + '<path d="' + path.join('') + '" fill="' + dark + '"/></svg>';
  }

  global.FOBQRCode = { matrix: matrix, svg: svg, version: VERSION };
}(window));
