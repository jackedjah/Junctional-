/* ══ FOB SYSTEMS :: SHARED GYM RENDERING ═══════════════════════════════════
   Coach Gym Tracker and Member My Gym had two separate graph renderers, and
   they drifted: the member page grew a per-metric session count, a subtitle,
   and empty metrics for variables the exercise does not even track. This file
   is the single implementation both now load, so that cannot happen again.

   Loaded by /gym-tracker and /mygym. Contains no member data and no
   privileged logic, only presentation.
   ═══════════════════════════════════════════════════════════════════════ */
(function (w) {
  'use strict';
  function h(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function graphPoints(values, w, hgt, pad) {
    if (!values.length) return [];
    var ys = values.map(function (v) { return safeNum(v.v); });
    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    if (hi === lo) { hi += 1; lo -= 1; }
    return values.map(function (v, i) {
      var x = values.length === 1 ? w / 2 : pad + i * (w - pad * 2) / (values.length - 1);
      var y = pad + (hi - safeNum(v.v)) * (hgt - pad * 2) / (hi - lo);
      return { x:x, y:y, v:v.v, date:v.date };
    });
  }
  /* Matches the Strength History graph on the FOB Progress GYM tab: real
     y-axis values, a rotated unit label, an x-axis label, dated ticks and a
     marked best. The old version drew a bare line with preserveAspectRatio
     "none", which stretched the box non-uniformly and would have distorted any
     text placed in it. That is gone; the viewBox is now uniform so labels
     render at their true proportions. */
  function miniGraph(title, unit, values) {
    values = values || [];
    var W = 320, H = 168, T = 12, R = 10, B = 34;
    var nums = values.map(function (p) { return Number(p.v); })
                     .filter(function (n) { return isFinite(n); });
    var has = nums.length > 0;

    var lo = has ? Math.min.apply(null, nums) : 0;
    var hi = has ? Math.max.apply(null, nums) : 1;
    if (hi === lo) { hi = lo + 1; lo = Math.max(0, lo - 1); }
    var pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    if (lo < 0 && Math.min.apply(null, nums.concat([0])) >= 0) lo = 0;

    var fmt = function (v) { return String(Math.round(v * 10) / 10); };
    var ticks = [hi, (hi + lo) / 2, lo];
    var gut = 0;
    ticks.forEach(function (v) { gut = Math.max(gut, fmt(v).length); });
    var L = 20 + gut * 4.6;                       /* room for the widest tick */

    var n = Math.max(1, values.length);
    var plotW = W - L - R;
    var x = function (i) { return L + (n <= 1 ? plotW / 2 : i * plotW / (n - 1)); };
    var y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo || 1)); };

    /* gridlines and their values */
    var grid = '';
    ticks.forEach(function (v) {
      var yy = y(v);
      grid += '<line class="grid" x1="' + L.toFixed(1) + '" x2="' + (W - R) + '" y1="' + yy.toFixed(1)
        + '" y2="' + yy.toFixed(1) + '"/>'
        + '<text class="gnum" x="' + (L - 5).toFixed(1) + '" y="' + (yy + 2.6).toFixed(1)
        + '" text-anchor="end">' + h(fmt(v)) + '</text>';
    });

    /* the line, its points, and the best one marked */
    var body = '', best = -1;
    if (has) {
      var bv = Math.max.apply(null, nums);
      values.forEach(function (p, i) { if (Number(p.v) === bv && best < 0) best = i; });
      var pts = values.map(function (p, i) {
        return isFinite(Number(p.v)) ? (x(i).toFixed(1) + ',' + y(Number(p.v)).toFixed(1)) : null;
      }).filter(Boolean);
      if (pts.length > 1) body += '<polyline class="trend" points="' + pts.join(' ') + '"/><polyline class="trendbeam-path" pathLength="100" points="' + pts.join(' ') + '"/>';
      values.forEach(function (p, i) {
        if (!isFinite(Number(p.v))) return;
        body += '<circle class="pt' + (i === best ? ' pt--best' : '') + '" cx="' + x(i).toFixed(1)
          + '" cy="' + y(Number(p.v)).toFixed(1) + '" r="' + (i === best ? 4 : 2.6) + '"/>';
      });
    }

    /* dated ticks, thinned so they can never collide */
    var xlab = '';
    if (has) {
      var step = Math.max(1, Math.ceil(values.length / 4));
      values.forEach(function (p, i) {
        if (i % step !== 0 && i !== values.length - 1) return;
        if (!p.date) return;
        var half = String(p.date).length * 2.4;
        var cx = Math.min(W - R - half, Math.max(L + half, x(i)));
        xlab += '<text class="xlab" x="' + cx.toFixed(1) + '" y="' + (H - B + 13)
          + '" text-anchor="middle">' + h(p.date) + '</text>';
      });
    }

    var axes = '<line class="axis" x1="' + L.toFixed(1) + '" x2="' + (W - R) + '" y1="' + (H - B)
        + '" y2="' + (H - B) + '"/>'
      + (unit ? '<text class="alab" transform="translate(7,' + ((T + H - B) / 2).toFixed(1)
          + ') rotate(-90)" text-anchor="middle">' + h(String(unit).toUpperCase()) + '</text>' : '')
      + '<text class="alab" x="' + (L + plotW / 2).toFixed(1) + '" y="' + (H - 5)
      + '" text-anchor="middle">SESSION</text>';

    var latest = values.length ? values[values.length - 1] : null;
    var head = latest
      ? (h(latest.v) + ' ' + h(unit)
         + (latest.context ? ' <small>(' + h(latest.context) + ')</small>' : ''))
      : '&ndash;';

    return '<section class="chart"><div class="chart__head"><b>' + h(title) + '</b>'
      + '<span>' + head + '</span></div>'
      + '<div class="chart__plot" data-empty="' + (has ? '0' : '1') + '">'
      + '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + h(title) + ' over time">'
      + grid + axes + body + xlab + '</svg>'
      + (has ? '' : '<span class="chartzero">No recorded data yet</span>') + '</div></section>';
  }

  /* A metric is only drawn when the exercise actually records it. A weight and
     reps movement has no business showing PEAK TIME 0 SEC. */
  function metricRow(title, unit, values, always) {
    if (!values || !values.length) { if (!always) return ''; }
    return miniGraph(title, unit, values);
  }

  w.FOBGym = { h: h, graphPoints: graphPoints, miniGraph: miniGraph, metricRow: metricRow };
}(window));
