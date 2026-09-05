'use strict';
/* FOB Systems :: member progress dashboard.

   FOBreakdown explains what happened today. This explains what is happening
   over time. Same recorded data, different question.

   Admin only, behind the existing S.isAuthed session. The member id arrives in
   the query string, but the query string alone grants nothing: without a valid
   admin cookie the handler returns the login page and never touches the
   database. There is no member-facing route to this data yet, deliberately.

   Data is fetched server side and inlined. No public data endpoint is added,
   so there is no URL a member could manipulate to reach another member. */

const S = require('./_session');
const P = require('./_payment');
const SH = require('./_share');

const H = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'no-store'
};

/* The five FOBadges and their thresholds, mirroring FOBRULES.tiers in
   report-cards.html exactly. Not reinvented, not renamed, not re-thresholded. */
const TIERS = [
  { id: 'fobaby', min: 0, name: 'FOBaby', max: 39,
    meaning: 'Starting tier. The score shows substantial room to improve control and consistency at the recorded prescription.' },
  { id: 'fobalance', min: 40, name: 'FOBalance', max: 59,
    meaning: 'Developing tier. The member is establishing control, with more consistency still available to build at the recorded prescription.' },
  { id: 'fobrilliant', min: 60, name: 'FOBrilliant', max: 79,
    meaning: 'Strong middle tier. The member is producing more consistent work across the scored demands of the recorded prescription.' },
  { id: 'fobeyond', min: 80, name: 'FOBeyond', max: 94,
    meaning: 'Advanced tier. High-quality performance is being maintained across most of the scored session at the recorded prescription.' },
  { id: 'fobeast', min: 95, name: 'FOBeast', max: 100,
    meaning: 'Highest tier. The score reflects near-complete execution of the scored session at the recorded prescription.' }
];

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function login() {
  return '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex,nofollow"><title>FOB Progress</title><!-- FOB Progress v209 --><style>'
    + 'body{margin:0;background:#14171B;color:#EFEAE0;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px}'
    + 'a{color:#D3BE98}</style></head><body><div><p style="letter-spacing:.28em;text-transform:uppercase;font-size:11px;color:#D3BE98">FOB Systems</p>'
    + '<h1 style="font-size:30px;margin:12px 0 18px">Progress</h1>'
    + '<p style="color:#9BA1A8;font-size:14px">Sign in from the member ledger first.</p>'
    + '<p style="margin-top:20px"><a href="/fob-payment">Go to FOB Payment</a></p></div></body></html>';
}

function shell(body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>FOB Progress</title><style>
:root{--ink:#05090D;--deep:#030609;--panel:#1B2026;--panel2:#20262D;--gold:#D3BE98;--bright:#E9C98F;
--dim:#A8946F;--text:#EFEAE0;--muted:#9BA1A8;--line:rgba(211,190,152,.20);--line2:rgba(211,190,152,.10)}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(ellipse 70% 40% at 50% 0,rgba(233,201,143,.035),transparent 60%),var(--ink);
color:var(--text);font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}
main{width:min(880px,92vw);margin:0 auto;padding:26px 0 72px}
a{color:var(--gold)}
.back{display:inline-block;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--dim);text-decoration:none;margin-bottom:18px}
.ey{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin:0 0 8px}
h1{font-size:clamp(30px,7vw,46px);line-height:.98;margin:0;letter-spacing:-.03em;color:#EEE7D8}
.hdr-sub{color:var(--muted);font-size:13px;margin:10px 0 0}
.card{background:linear-gradient(150deg,rgba(32,38,45,.92),rgba(24,29,34,.92));border:1px solid var(--line);
border-radius:16px;padding:18px;margin-top:14px}
.card h2{margin:0 0 3px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
.card p.note{margin:0 0 14px;color:var(--muted);font-size:12px;line-height:1.5}
/* badge ladder */
.ladder{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:4px}
.bg{text-align:center;padding:10px 3px 9px;border:1px solid transparent;border-radius:13px;position:relative}
.bg img{width:100%;max-width:74px;display:block;margin:0 auto 7px;opacity:.24;filter:grayscale(1) brightness(.75)}
.bg span{display:block;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:#6E747B}
.bg em{display:block;font-style:normal;font-size:8px;letter-spacing:.1em;color:#575D64;margin-top:2px}
.bg.earned img{opacity:.62;filter:none}
.bg.earned span{color:var(--dim)}
.bg.now{border-color:rgba(233,201,143,.5);background:linear-gradient(180deg,rgba(233,201,143,.10),rgba(233,201,143,.02))}
.bg.now img{opacity:1;filter:none}
.bg.now span{color:var(--bright);font-weight:700}
.bg.now em{color:var(--dim)}
.stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:14px}
.stat{background:rgba(14,17,20,.5);border:1px solid var(--line2);border-radius:13px;padding:13px 11px;text-align:center}
.stat b{display:block;font-size:clamp(22px,5.4vw,30px);color:var(--bright);letter-spacing:-.02em;line-height:1}
.stat span{display:block;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-top:7px}
.read{margin-top:14px;border-left:2px solid rgba(233,201,143,.42);padding:2px 0 2px 13px}
.read p{margin:0 0 7px;font-size:14px;line-height:1.55;color:#DCD7CC}
.read p:last-child{margin-bottom:0}
svg{display:block;width:100%;height:auto;overflow:hidden;max-width:460px;margin:0 auto}.mini svg{max-width:none}
.legend{display:flex;flex-wrap:wrap;gap:11px;margin-top:11px}
.legend i{display:flex;align-items:center;gap:5px;font-style:normal;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}
.legend b{width:13px;height:2px;border-radius:2px;display:block}
.grid2{display:grid;grid-template-columns:1fr;gap:14px}
@media(min-width:720px){.grid2{grid-template-columns:1fr 1fr}}
.mini h3{margin:0 0 2px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim)}
.mini .val{font-size:13px;color:var(--text);margin:0 0 7px}
.hist{display:flex;flex-direction:column;gap:8px;margin-top:4px}
.hrow{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center;
background:rgba(14,17,20,.42);border:1px solid var(--line2);border-radius:12px;padding:11px 13px}
.hrow img{width:32px;height:32px;object-fit:contain}
.hrow .d{font-size:12px;color:var(--text)}
.hrow .p{font-size:10px;color:var(--muted);margin-top:3px;line-height:1.45}
.hrow .s{font-size:19px;color:var(--bright);text-align:right;line-height:1}
.hrow .s em{display:block;font-style:normal;font-size:8px;letter-spacing:.13em;text-transform:uppercase;color:var(--dim);margin-top:4px}
a.hrow{text-decoration:none;transition:border-color .18s,background .18s}
a.hrow:hover,a.hrow:focus-visible{border-color:var(--line);background:rgba(20,26,32,.72);outline:none}
a.hrow .go{grid-column:1/-1;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--dim);margin-top:2px}
.share{margin-top:4px}
.share .lnk{display:block;width:100%;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text);
background:rgba(14,17,20,.62);border:1px solid var(--line2);border-radius:10px;padding:11px 12px;
word-break:break-all;resize:none;min-height:66px}
.share .row{display:flex;gap:9px;margin-top:10px;flex-wrap:wrap}
.share button{font:inherit;font-size:10px;letter-spacing:.17em;text-transform:uppercase;cursor:pointer;
padding:9px 15px;border-radius:9px;border:1px solid var(--line);background:rgba(211,190,152,.10);color:var(--gold)}
.share button:hover{background:rgba(211,190,152,.18)}
.share button.warn{border-color:rgba(200,120,110,.34);color:#D9A49C;background:rgba(200,120,110,.08)}
.share button.warn:hover{background:rgba(200,120,110,.16)}
.preview-kicker{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.preview-kicker span{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.preview-kicker b{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);font-weight:700}
.empty-ladder .bg img{opacity:.16;filter:grayscale(1) brightness(.62)}
.empty-ladder .bg span{color:#5C6268}.empty-ladder .bg em{color:#454B51}
.stat.placeholder b{color:#696F75}.stat.placeholder span{color:#666C72}
.graph-shell{position:relative}.graph-wait{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#676D73;white-space:nowrap;pointer-events:none}
/* ══ FOB / GYM TABS ═══════════════════════════════════════════════════
   Two training systems belonging to one member. They are never mixed: a FOB
   Score and a barbell load measure different things and share only a person.
   Server-rendered links rather than client tabs, so each view is its own URL
   and nothing has to hydrate before the page is readable. */
.tabs{display:flex;gap:0;margin:0 0 22px;border:1px solid var(--line2)}
.tabs a{flex:1;text-align:center;padding:13px 8px;text-decoration:none;color:var(--dim);
  font-size:10px;letter-spacing:.26em;text-transform:uppercase;font-weight:700;
  border-right:1px solid var(--line2)}
.tabs a:last-child{border-right:0}
.tabs a[aria-current="page"]{color:var(--bright);background:rgba(233,201,143,.07)}
.gsel{display:block;width:100%;min-height:48px;border:1px solid var(--line2);
  background:#171A1E;color:var(--text);padding:11px 13px;font-size:15px;border-radius:2px;
  -webkit-appearance:none;appearance:none;outline:none;margin-bottom:14px}
.gsel:focus{border-color:rgba(233,201,143,.45)}
.grec{font-variant-numeric:tabular-nums}
.grec div{display:flex;gap:12px;align-items:baseline;padding:10px 2px;border-bottom:1px solid var(--line2)}
.grec div:last-child{border-bottom:0}
.grec em{font-style:normal;flex:0 0 66px;font-size:10px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--dim)}
.grec b{flex:1;font-weight:400;font-size:14px;color:var(--text)}
.grec i{font-style:normal;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.empty{text-align:center;padding:38px 16px;color:var(--muted);font-size:14px;line-height:1.6}
.empty strong{display:block;color:var(--gold);font-size:12px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:11px}
.foot{margin-top:26px;text-align:center;font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#4E545B}
</style><link rel="stylesheet" href="/coach-shell.css?v=452&rc5c=1"><link rel="stylesheet" href="/mahfitt-atmosphere.css?v=452"></head><body><main>${body}</main><script defer src="/coach-shell.js?v=452&rc5c=1"></script></body></html>`;
}

/* ---- tiny SVG chart helpers. No libraries on this site, and a hand-rolled
   polyline keeps the brand language rather than importing someone else's. ---- */
/* ═══════════════════════════════════════════════════════════════════════
   ONE chart renderer. This replaces the previous chart() + emptyChart()
   pair, which carried two copies of the same geometry constants and drifted.
   emptyChart is kept only as a thin alias so existing call sites still work.

   ROOT CAUSES THIS FIXES

   1. Badge threshold labels were drawn in the LEFT GUTTER at x = L-4 with
      text-anchor="end". "FOBrilliant" is about 36 user units wide, so from
      an anchor at x=22 it ran to roughly x=-15: outside the viewBox. With
      svg{overflow:visible} it did not clip, it escaped the card. That is the
      label text appearing outside the chart and past the viewport edge.

   2. The numeric axis ticks were drawn at the SAME x as those band labels
      and the same size, so "50" and "FOBalance" landed on top of each other.

   3. The viewBox was a fixed 320 wide for every chart. Text scales with the
      viewBox, so the same font-size rendered around 3px inside a half-width
      .mini panel and around 14px on a wide desktop card, louder than the
      card heading. Width is now per-chart via o.w, and CSS caps upscaling.

   THE MODEL: container width -> viewBox width -> plot box -> label positions.
   Every label is positioned from the plot box, so nothing can leave it.
   ═══════════════════════════════════════════════════════════════════════ */

/* Width of a string in user units. Helvetica/Arial digits and caps average
   close to these ratios; deliberately generous so the gutter is never too
   tight rather than occasionally too tight. */
function textW(str, size, tracking) {
  const t = String(str == null ? '' : str);
  let w = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (/[.,:'’ ]/.test(c)) w += 0.30;
    else if (/[ilIjt1]/.test(c)) w += 0.34;
    else if (/[A-Z%]/.test(c)) w += 0.70;
    else w += 0.55;
  }
  return w * size + (tracking || 0) * size * Math.max(0, t.length - 1);
}

function chart(series, opts) {
  const o = opts || {};
  const W = o.w || 320;
  const HT = o.height || 132;
  const R = 8, T = 9;
  const FS = o.fs || 7;                       /* one type size for the plot */
  const FSX = FS - 0.2;                       /* axis titles, one step down */
  const B = (o.xLabel ? 26 : 15) + (o.labels && o.labels.length ? 8 : 0);

  const list = [];
  series.forEach(function (s) { s.pts.forEach(function (v) { if (v != null) list.push(v); }); });
  const scaffold = !list.length;
  if (scaffold && (o.min == null || o.max == null)) return '<p class="note">Not recorded yet.</p>';

  let lo = o.min != null ? o.min : Math.min.apply(null, list);
  let hi = o.max != null ? o.max : Math.max.apply(null, list);
  if (hi === lo) { hi = lo + 1; lo = Math.max(0, lo - 1); }
  const padv = (hi - lo) * 0.12;
  if (o.min == null) lo -= padv;
  if (o.max == null) hi += padv;
  if (o.floorZero && lo < 0) lo = 0;

  /* Numeric ticks decided first, because the left gutter is sized from the
     widest one actually drawn rather than from a guessed constant. */
  const fmt = function (v) { return o.fmt ? String(o.fmt(v)) : String(Math.round(v)); };
  const tickVals = o.bands && o.bands.length ? [(lo + hi) / 2] : [lo, (lo + hi) / 2, hi];
  let gut = 0;
  tickVals.forEach(function (v) { gut = Math.max(gut, textW(fmt(v), FS, 0)); });
  const L = Math.min(W * 0.34, Math.max(16, Math.ceil(gut) + 6) + (o.yLabel ? 11 : 0));

  const n = Math.max(1, o.count || 0);
  const plotW = W - L - R;
  const x = function (i) { return L + (n <= 1 ? plotW / 2 : i * plotW / (n - 1)); };
  const y = function (v) { return T + (HT - T - B) * (1 - (v - lo) / (hi - lo || 1)); };

  /* ---- threshold bands. Labels sit INSIDE the plot, right aligned, just
     above their own line. They can no longer reach the gutter or the edge. */
  let g = '';
  const bandYs = [];
  (o.bands || []).forEach(function (b) {
    if (b.v < lo || b.v > hi) return;
    const yy = y(b.v);
    bandYs.push(yy);
    const lw = textW(b.label, FS, 0.05);
    g += '<line x1="' + L.toFixed(1) + '" x2="' + (W - R).toFixed(1) + '" y1="' + yy.toFixed(1)
      + '" y2="' + yy.toFixed(1) + '" stroke="rgba(211,190,152,.16)" stroke-width="1" stroke-dasharray="2 4"/>'
      /* nudged down when the line sits at the very top so the cap height
         cannot ride above the plot box */
      + '<text x="' + (W - R - 2).toFixed(1) + '" y="' + Math.max(T + FS - 1, yy - 2.6).toFixed(1)
      + '" text-anchor="end" font-size="' + FS + '" fill="#7C838B" letter-spacing=".05em"'
      + ' textLength="' + Math.min(lw, plotW - 6).toFixed(1) + '" lengthAdjust="spacingAndGlyphs">'
      + esc(b.label) + '</text>';
  });

  /* Numeric ticks, skipped when one would land on a band label. */
  let gt = '';
  tickVals.forEach(function (v) {
    const yy = y(v);
    for (let k = 0; k < bandYs.length; k++) if (Math.abs(bandYs[k] - yy) < FS + 2) return;
    gt += '<text x="' + (L - 4).toFixed(1) + '" y="' + (yy + FS * 0.34).toFixed(1)
      + '" text-anchor="end" font-size="' + FS + '" fill="#5F666D">' + esc(fmt(v)) + '</text>';
  });

  /* ---- plot ---- */
  let body = '';
  if (scaffold) {
    const mid = y((lo + hi) / 2);
    const slots = Math.max(2, n);
    const pts = [];
    for (let i = 0; i < slots; i++) pts.push(x(i).toFixed(1) + ',' + mid.toFixed(1));
    body += '<polyline fill="none" stroke="rgba(211,190,152,.16)" stroke-width="1.4"'
      + ' stroke-linecap="round" stroke-dasharray="1 5" points="' + pts.join(' ') + '"/>';
    for (let i = 0; i < slots; i++) {
      body += '<circle cx="' + x(i).toFixed(1) + '" cy="' + mid.toFixed(1)
        + '" r="2.2" fill="none" stroke="rgba(211,190,152,.24)" stroke-width="1"/>';
    }
  } else {
    series.forEach(function (s) {
      const seg = []; let run = [];
      s.pts.forEach(function (v, i) {
        if (v == null) { if (run.length) seg.push(run); run = []; return; }
        run.push(x(i).toFixed(1) + ',' + y(v).toFixed(1));
      });
      if (run.length) seg.push(run);
      seg.forEach(function (r) {
        if (r.length > 1) body += '<polyline fill="none" stroke="' + s.color + '" stroke-width="' + (s.w || 1.8)
          + '" stroke-linejoin="round" stroke-linecap="round" points="' + r.join(' ') + '"/>';
      });
      if (s.dots !== false) s.pts.forEach(function (v, i) {
        if (v == null) return;
        const best = o.markBest != null && i === o.markBest && s.primary;
        body += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + (best ? 4 : 2.3)
          + '" fill="' + (best ? '#E9C98F' : s.color) + '"'
          + (best ? ' stroke="#14171B" stroke-width="1.4"' : '') + '/>';
      });
    });
  }

  /* ---- x tick labels. Thinned by measured width, not by a fixed count, so
     they can never run into each other however long the dates are. ---- */
  let ticks = '';
  const labs = o.labels || [];
  if (labs.length) {
    let widest = 0;
    labs.forEach(function (l) { if (l) widest = Math.max(widest, textW(l, FS, 0)); });
    const fit = Math.max(2, Math.floor(plotW / (widest + 8)));
    const step = Math.max(1, Math.ceil(labs.length / fit));
    /* Greedy placement by measured width. Stepping alone is not enough: the
       last label is always wanted, and on a dense axis it lands right next to
       the previous stepped one. Anything that would touch the label already
       placed is dropped, so labels can never run into each other at any
       session count. */
    let lastRight = -Infinity;
    const place = [];
    labs.forEach(function (lab, i) {
      if (!lab) return;
      if (i % step !== 0 && i !== labs.length - 1) return;
      place.push(i);
    });
    place.forEach(function (i, k) {
      const lab = labs[i];
      const half = textW(lab, FS, 0) / 2;
      const cx = Math.min(W - R - half, Math.max(L + half, x(i)));
      const isLast = k === place.length - 1;
      if (cx - half < lastRight + 3) {
        /* The final label wins the conflict: it carries the most recent
           SESH, which is the one being read. Drop the one before it. */
        if (!isLast) return;
        ticks = ticks.slice(0, ticks.lastIndexOf('<text'));
      }
      lastRight = cx + half;
      ticks += '<text x="' + cx.toFixed(1) + '" y="' + (HT - B + FS + 3).toFixed(1)
        + '" text-anchor="middle" font-size="' + FS + '" fill="#5F666D">' + esc(lab) + '</text>';
    });
  }

  /* ---- axis furniture ---- */
  let axes = '<line x1="' + L.toFixed(1) + '" x2="' + (W - R).toFixed(1) + '" y1="' + (HT - B)
    + '" y2="' + (HT - B) + '" stroke="rgba(211,190,152,.10)" stroke-width="1"/>';
  if (o.xLabel) {
    axes += '<text x="' + (L + plotW / 2).toFixed(1) + '" y="' + (HT - 3)
      + '" text-anchor="middle" font-size="' + FSX + '" fill="#666D74" letter-spacing=".12em"'
      + ' textLength="' + Math.min(textW(String(o.xLabel).toUpperCase(), FSX, 0.12), plotW).toFixed(1)
      + '" lengthAdjust="spacingAndGlyphs">' + esc(String(o.xLabel).toUpperCase()) + '</text>';
  }
  if (o.yLabel) {
    /* Rotated, centred on the plot box, and length-clamped to the plot
       height so a long unit name can never run past the top or bottom. */
    const cy = T + (HT - T - B) / 2;
    const cap = HT - T - B - 6;
    axes += '<text x="5.5" y="' + cy.toFixed(1) + '" text-anchor="middle" font-size="' + FSX
      + '" fill="#666D74" letter-spacing=".10em" transform="rotate(-90 5.5 ' + cy.toFixed(1) + ')"'
      + ' textLength="' + Math.min(textW(String(o.yLabel).toUpperCase(), FSX, 0.10), cap).toFixed(1)
      + '" lengthAdjust="spacingAndGlyphs">' + esc(String(o.yLabel).toUpperCase()) + '</text>';
  }

  const svg = '<svg viewBox="0 0 ' + W + ' ' + HT + '" role="img"'
    + (o.aria ? ' aria-label="' + esc(o.aria) + '"' : '') + '>' + axes + g + gt + body + ticks + '</svg>';
  return scaffold
    ? '<div class="graph-shell">' + svg + '<span class="graph-wait">Awaiting first SESH</span></div>'
    : svg;
}

/* Alias kept so existing call sites keep working. One implementation only. */
function emptyChart(opts) {
  const o = opts || {};
  return chart([{ pts: [], color: '#E9C98F' }], Object.assign({}, o, {
    count: o.count || 6,
    min: o.min == null ? 0 : o.min,
    max: o.max == null ? 100 : o.max
  }));
}

function legend(items) {
  return '<div class="legend">' + items.map(function (i) {
    return '<i><b style="background:' + i.color + '"></b>' + esc(i.name) + '</i>';
  }).join('') + '</div>';
}

function careerTier(bestPct) {
  let i = 0;
  for (let k = 0; k < TIERS.length; k++) if (bestPct >= TIERS[k].min) i = k;
  return i;
}

function shortDate(d) {
  const p = String(d || '').split('-');
  if (p.length !== 3) return String(d || '');
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10);
}

const BANDN = { Min: 1, Med: 2, Max: 3 };

/* At most two sentences, and only what the rows actually support. No composite
   workload index: the FOB model does not define one, so none is invented. */
function readout(rows) {
  const out = [];
  const n = rows.length;
  const pct = rows.map(function (r) { return Number(r.overall_score); });
  const best = Math.max.apply(null, pct);
  const bestRow = rows[pct.indexOf(best)];

  if (n >= 3) {
    const recent = rows.slice(-Math.min(4, n));
    const rp = recent.map(function (r) { return Number(r.overall_score); });
    const drift = rp[rp.length - 1] - rp[0];
    /* Did any prescription variable actually get harder across the same span? */
    const harder = [];
    const first = recent[0], last = recent[recent.length - 1];
    if (last.block_lb != null && first.block_lb != null && last.block_lb > first.block_lb) harder.push('the FOBlock is heavier');
    if (last.band_level && first.band_level && (BANDN[last.band_level] || 0) > (BANDN[first.band_level] || 0)) harder.push('the FOBand is stronger');
    if (last.marker_core_in != null && first.marker_core_in != null && last.marker_core_in > first.marker_core_in) harder.push('the marker is further out');
    if (last.dur_core_s != null && first.dur_core_s != null && last.dur_core_s > first.dur_core_s) harder.push('the sets are longer');
    if (harder.length && Math.abs(drift) <= 4) {
      out.push('Your score is holding while the prescription is getting harder: ' + harder.slice(0, 2).join(' and ') + '.');
    } else if (harder.length && drift > 4) {
      out.push('Your score is up ' + Math.round(drift) + ' points across your last ' + recent.length
        + ' recorded SESHes, and ' + harder[0] + ' over the same span.');
    } else if (drift > 4) {
      out.push('Your score is up ' + Math.round(drift) + ' points across your last ' + recent.length + ' recorded SESHes.');
    }
  }

  if (out.length < 2 && n >= 3) {
    const cats = [['core_pct', 'Reactive Core'], ['iso_pct', 'Isometric Control'], ['pp_pct', 'Push / Pull'], ['tech_pct', 'Movement Styles']];
    const span = rows.slice(-Math.min(4, n));
    let bestCat = null;
    cats.forEach(function (c) {
      const v = span.map(function (r) { return r[c[0]] == null ? null : Number(r[c[0]]); }).filter(function (x) { return x != null; });
      if (v.length < 3) return;
      const d = v[v.length - 1] - v[0];
      if (d > 5 && (!bestCat || d > bestCat.d)) bestCat = { name: c[1], d: d };
    });
    if (bestCat) out.push(bestCat.name + ' has improved across your last ' + span.length + ' recorded SESHes.');
  }

  if (!out.length) {
    out.push('Your best score is ' + Math.round(best) + '%, recorded ' + shortDate(bestRow.session_date)
      + ' on ' + (bestRow.profile_label || 'the recorded prescription') + '.');
  }
  return out.slice(0, 2);
}

/* opts.share === true renders the member-facing copy served by /fob-share:
   the same dashboard, minus every admin affordance. No ledger link, no share
   controls, no replay links into FOB Rounds, no route a visitor could walk
   back to. The data shown is one member's own performance history and nothing
   else, because the caller only ever hands us that one member's rows. */
function tabs(id, on) {
  const u = '/fob-progress?m=' + encodeURIComponent(id);
  return '<nav class="tabs">'
    + '<a href="' + u + '"' + (on === 'fob' ? ' aria-current="page"' : '') + '>FOB</a>'
    + '<a href="' + u + '&tab=gym"' + (on === 'gym' ? ' aria-current="page"' : '') + '>Gym</a></nav>';
}

/* ══ GYM PROGRESS ═══════════════════════════════════════════════════════
   Traditional strength progression. Deliberately kept apart from the FOB
   numbers above: same member, different training system, and averaging a
   FOB Score against a barbell load would mean nothing.

   Reads gym_sessions for what was done and gym_sets for how it went. The
   exercise selector is a plain form GET, so picking a lift is one request
   and the page stays readable with no client-side hydration.
   ═══════════════════════════════════════════════════════════════════════ */
function gymPage(member, sessions, sets, pick, exercises) {
  const name = (member.first_name + ' ' + member.last_name).trim();
  const head = '<a class="back" href="/fob-payment">&larr; Member ledger</a>'
    + '<p class="ey">Gym Progress</p><h1>' + esc(name.toUpperCase()) + '</h1>'
    + tabs(member.id, 'gym');

  if (!sessions.length) {
    return shell(head + '<div class="card"><div class="empty">'
      + '<strong>No gym sessions yet</strong>'
      + 'Open Gym Tracker, choose ' + esc(name) + ', and finish a workout. '
      + 'Completed sessions appear here automatically.</div></div>'
      + '<p class="foot">One system. Endless applications.</p>');
  }

  const last = sessions[sessions.length - 1];
  const mins = sessions.map(s => Math.round((s.duration_s || 0) / 60));
  const totalMin = mins.reduce((a, b) => a + b, 0);

  const stats = '<div class="stats">'
    + '<div class="stat"><b>' + sessions.length + '</b><span>Completed sessions</span></div>'
    + '<div class="stat"><b>' + Math.round(totalMin / Math.max(1, sessions.length)) + '</b><span>Avg minutes</span></div>'
    + '<div class="stat"><b>' + esc(shortDate(last.session_date)) + '</b><span>Most recent</span></div></div>';

  const recent = '<div class="card"><h2>Recent workout</h2>'
    + '<p class="note">' + esc(last.name || 'Session') + ' &middot; '
    + esc(shortDate(last.session_date)) + ' &middot; '
    + Math.round((last.duration_s || 0) / 60) + ' min</p></div>';

  /* ---- strength history for the chosen lift ---- */
  const byDate = {};
  sets.forEach(function (r) { (byDate[r.session_date] = byDate[r.session_date] || []).push(r); });
  const days = Object.keys(byDate).sort();

  /* Best set per day, by load then reps. A single honest number to plot:
     no estimated one-rep max, because the FOB model does not define one and
     inventing a formula here would be inventing science. */
  const best = days.map(function (d) {
    return byDate[d].reduce(function (a, b) {
      const aw = a.weight == null ? -1 : Number(a.weight), bw = b.weight == null ? -1 : Number(b.weight);
      if (bw !== aw) return bw > aw ? b : a;
      return (b.reps || 0) > (a.reps || 0) ? b : a;
    });
  });
  const series = best.map(function (r) { return r.weight == null ? null : Number(r.weight); });
  const hasLoad = series.some(function (v) { return v != null; });
  const pr = hasLoad ? Math.max.apply(null, series.filter(function (v) { return v != null; })) : null;

  const options = exercises.map(function (e) {
    return '<option value="' + esc(e) + '"' + (e === pick ? ' selected' : '') + '>' + esc(e) + '</option>';
  }).join('');

  const strength = '<div class="card"><h2>Strength history</h2>'
    + '<form method="GET" action="/fob-progress">'
    + '<input type="hidden" name="m" value="' + esc(member.id) + '">'
    + '<input type="hidden" name="tab" value="gym">'
    + '<select class="gsel" name="ex" onchange="this.form.submit()">' + options + '</select>'
    + '<noscript><button class="gsel" type="submit">Show</button></noscript></form>'
    + (hasLoad
      ? '<p class="note">Heaviest working set each session' + (pr != null ? ', best ' + pr + ' lb' : '') + '.</p>'
        + chart([{ pts: series, color: '#E9C98F', w: 2, primary: true }],
            { count: days.length, w: 320, labels: days.map(shortDate), height: 150,
              markBest: series.indexOf(pr), yLabel: 'Pounds', xLabel: 'Session',
              aria: pick + ' load over time' })
      : '<p class="note">This exercise is not tracked by load, so there is no weight curve. '
        + 'The recorded sets are below.</p>')
    + '<div class="grec" style="margin-top:14px">'
    + days.slice().reverse().slice(0, 10).map(function (d) {
        const line = byDate[d].map(function (r) {
          if (r.fm_distance != null) return r.fm_distance + '&Prime; / ' + Math.round(r.fm_time_s || 0) + 's';
          if (r.weight != null && r.reps != null) return r.weight + ' \u00d7 ' + r.reps;
          if (r.time_s != null) return Math.round(r.time_s) + 's';
          return r.reps != null ? r.reps + ' reps' : '\u2013';
        }).join('  /  ');
        const isPr = pr != null && byDate[d].some(function (r) { return Number(r.weight) === pr; });
        return '<div><em>' + esc(shortDate(d)) + '</em><b>' + line + '</b>'
          + (isPr ? '<i>Best</i>' : '') + '</div>';
      }).join('')
    + '</div></div>';

  /* ---- session duration, the simplest adherence read there is ---- */
  const duration = '<div class="card"><h2>Session duration</h2>'
    + '<p class="note">Every completed gym session, oldest first.</p>'
    + chart([{ pts: mins, color: '#9FB8A4', w: 1.6 }],
        { count: mins.length, w: 320, labels: sessions.map(function (s) { return shortDate(s.session_date); }),
          height: 128, floorZero: true, yLabel: 'Minutes', xLabel: 'Session',
          aria: 'Session duration over time' })
    + '</div>';

  const list = '<div class="card"><h2>Completed sessions</h2><div class="grec">'
    + sessions.slice().reverse().slice(0, 20).map(function (s) {
        return '<div><em>' + esc(shortDate(s.session_date)) + '</em><b>'
          + esc(s.name || 'Session') + '</b><i>'
          + Math.round((s.duration_s || 0) / 60) + ' min</i></div>';
      }).join('')
    + '</div></div>';

  return shell(head + stats + recent + strength + duration + list
    + '<p class="foot">One system. Endless applications.</p>');
}

function page(member, rows, opts) {
  const o = opts || {};
  const share = o.share === true;
  const name = (member.first_name + ' ' + member.last_name).trim();
  const head = (share ? '' : '<a class="back" href="/fob-payment">&larr; Member ledger</a>')
    + '<p class="ey">FOB Progress</p><h1>' + esc(name.toUpperCase()) + '</h1>'
    + (share ? '' : tabs(member.id, 'fob'));

  if (!rows.length) {
    const emptyLadder = '<div class="ladder empty-ladder">' + TIERS.map(function(t){
      return '<div class="bg"><img src="/images/badges/' + t.id + '.png" alt="" loading="lazy">'
        + '<span>' + esc(t.name) + '</span><em>' + (t.min === 0 ? 'Start' : t.min + '%+') + '</em></div>';
    }).join('') + '</div>';
    const emptyStats = '<div class="stats">'
      + '<div class="stat placeholder"><b>&mdash;</b><span>Personal best</span></div>'
      + '<div class="stat placeholder"><b>0</b><span>Recorded SESHes</span></div>'
      + '<div class="stat placeholder"><b>&mdash;</b><span>Most recent</span></div></div>';
    const scoreBands = [{v:40,label:'FOBalance'},{v:60,label:'FOBrilliant'},{v:80,label:'FOBeyond'},{v:95,label:'FOBeast'}];
    const catLegend = legend([
      {name:'Reactive Core',color:'#E9C98F'}, {name:'Isometric Control',color:'#9FB8A4'},
      {name:'Push / Pull',color:'#B9A0C9'}, {name:'Movement Styles',color:'#8FAAC4'}]);
    const emptyPres = [
      ['FOBlock','Load (lb)',0,10,null], ['FOBand','Band level',1,3,function(v){return ['', 'Min','Med','Max'][Math.round(v)]||'';}],
      ['Core marker','Distance (in)',0,100,null], ['Core set length','Time (sec)',0,120,null]
    ].map(function(p){ return '<div class="mini"><h3>'+p[0]+'</h3><p class="val">Now: Not recorded</p>'
      + emptyChart({w:168,fs:8.4,height:92,min:p[2],max:p[3],xLabel:'SESH',yLabel:p[1],fmt:p[4],aria:p[0]+' progression awaiting data'}) + '</div>'; }).join('');
    return shell(head
      + '<div class="card"><div class="preview-kicker"><b>Progress dashboard</b><span>Ready before SESH 01</span></div>'
      + '<h2>Career badge</h2><p class="note">Five FOBadges form one score hierarchy from the starting tier to the highest tier. No badge is selected until this member completes a scored FOB SESH.</p>'
      + emptyLadder + emptyStats + '</div>'
      + '<div class="card"><h2>FOB Score over time</h2><p class="note">Each point is one completed SESH. The graph tracks total FOB Score over time, while the badge threshold lines show when a higher tier was reached.</p>'
      + emptyChart({height:150,min:0,max:100,xLabel:'Completed SESHes',yLabel:'FOB Score %',bands:scoreBands,aria:'FOB Score over time awaiting data'}) + '</div>'
      + '<div class="card"><h2>Movement category development</h2><p class="note">Tracks the four scored FOB performance categories separately so you can see which qualities are improving and which are limiting the session.</p>'
      + emptyChart({height:150,min:0,max:100,xLabel:'Completed SESHes',yLabel:'Category %',aria:'Movement category development awaiting data'}) + catLegend + '</div>'
      + '<div class="card"><h2>Prescription progression</h2><p class="note">Tracks the settings that changed the demand of each SESH. FOBlock, FOBand, marker distance and set duration stay separate so the history shows what actually changed.</p><div class="grid2">' + emptyPres + '</div></div>'
      + '<div class="card"><h2>Repeatability</h2><p class="note">Compares the final recorded round with the first. Near zero means performance held, a positive value means the final round scored higher, and a negative value means it fell.</p>'
      + emptyChart({height:132,min:-30,max:30,xLabel:'Completed SESHes',yLabel:'Round delta (pts)',bands:[{v:0,label:'Even'}],aria:'Repeatability awaiting data'}) + '</div>'
      + '<div class="card"><h2>Best round against session score</h2><p class="note">Compares the highest-scoring round with the total session score. A smaller gap means more of the session matched the member&rsquo;s best round.</p>'
      + emptyChart({height:132,min:0,max:100,xLabel:'Completed SESHes',yLabel:'Score %',aria:'Best round versus session score awaiting data'})
      + legend([{name:'Best round',color:'#9FB8A4'},{name:'Session score',color:'#E9C98F'}]) + '</div>'
      + '<div class="card"><h2>Recorded SESHes</h2><div class="empty" style="padding:24px 12px"><strong>No completed SESHes yet</strong>The dashboard is already built. Data begins populating automatically after the first completed, member-linked FOB SESH.</div></div>'
      + '<p class="foot">One system. Endless applications.</p>');
  }

  const pct = rows.map(function (r) { return Number(r.overall_score); });
  const best = Math.max.apply(null, pct);
  const bestIdx = pct.indexOf(best);
  const ci = careerTier(best);
  const labels = rows.map(function (r) { return shortDate(r.session_date); });
  const n = rows.length;

  /* Career badge: strongest ever legitimately earned, never the latest score. */
  const ladder = '<div class="ladder">' + TIERS.map(function (t, i) {
    const cls = i === ci ? 'bg now' : (i < ci ? 'bg earned' : 'bg');
    return '<div class="' + cls + '"><img src="/images/badges/' + t.id + '.png" alt="" loading="lazy">'
      + '<span>' + esc(t.name) + '</span><em>' + (t.min === 0 ? 'Start' : t.min + '%+') + '</em></div>';
  }).join('') + '</div>';

  const stats = '<div class="stats">'
    + '<div class="stat"><b>' + Math.round(best) + '%</b><span>Personal best</span></div>'
    + '<div class="stat"><b>' + n + '</b><span>Recorded SESH' + (n === 1 ? '' : 'es') + '</span></div>'
    + '<div class="stat"><b>' + Math.round(pct[n - 1]) + '%</b><span>Most recent</span></div></div>';

  const reads = '<div class="read"><p><b>' + esc(TIERS[ci].name) + '</b> · ' + esc(TIERS[ci].meaning) + '</p>' + readout(rows).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div>';

  /* 1. FOB score over time */
  const c1 = '<div class="card"><h2>FOB Score over time</h2>'
    + '<p class="note">Each point is one completed SESH. The large dot marks the personal best, and the dashed lines mark the five-badge hierarchy.</p>'
    + chart([{ pts: pct, color: '#E9C98F', w: 2, primary: true }],
      { count: n, labels: labels, min: 0, max: 100, height: 150, markBest: bestIdx, xLabel: 'Completed SESHes', yLabel: 'FOB Score %',
        bands: [{ v: 40, label: 'FOBalance' }, { v: 60, label: 'FOBrilliant' }, { v: 80, label: 'FOBeyond' }, { v: 95, label: 'FOBeast' }] })
    + '</div>';

  /* 2. Movement category development */
  const cats = [
    { key: 'core_pct', name: 'Reactive Core', color: '#E9C98F' },
    { key: 'iso_pct', name: 'Isometric Control', color: '#9FB8A4' },
    { key: 'pp_pct', name: 'Push / Pull', color: '#B9A0C9' },
    { key: 'tech_pct', name: 'Movement Styles', color: '#8FAAC4' }
  ];
  const catSeries = cats.map(function (c) {
    return { pts: rows.map(function (r) { return r[c.key] == null ? null : Number(r[c.key]); }), color: c.color, w: 1.5 };
  });
  const c2 = '<div class="card"><h2>Movement category development</h2>'
    + '<p class="note">Tracks Reactive Core, Isometric Control, Push / Pull and Movement Styles separately so changes inside the total score stay visible.</p>'
    + chart(catSeries, { count: n, labels: labels, min: 0, max: 100, height: 150, xLabel: 'Completed SESHes', yLabel: 'Category %' })
    + legend(cats) + '</div>';

  /* 3. Prescription progression. Shown as the actual variables. The FOB model
     defines no validated combined workload index, so none is fabricated. */
  const pres = [
    { key: 'block_lb', name: 'FOBlock', unit: ' lb', color: '#E9C98F' },
    { key: 'band_level', name: 'FOBand', unit: '', color: '#9FB8A4', band: true },
    { key: 'marker_core_in', name: 'Core marker', unit: '"', color: '#B9A0C9' },
    { key: 'dur_core_s', name: 'Core set length', unit: 's', color: '#8FAAC4' }
  ];
  const c3 = '<div class="card"><h2>Prescription progression</h2>'
    + '<p class="note">Tracks the actual prescription used in each SESH. The variables stay separate so a harder setup is visible without inventing a combined workload score.</p>'
    + '<div class="grid2">' + pres.map(function (p) {
      const vals = rows.map(function (r) {
        const v = r[p.key];
        if (v == null) return null;
        return p.band ? (BANDN[v] || null) : Number(v);
      });
      const lastV = rows[n - 1][p.key];
      return '<div class="mini"><h3>' + esc(p.name) + '</h3>'
        + '<p class="val">Now: ' + (lastV == null ? 'Not recorded' : esc(String(lastV)) + p.unit) + '</p>'
        + chart([{ pts: vals, color: p.color, w: 1.6 }],
          { count: n, w: 168, fs: 8.4, labels: [], height: 92, floorZero: true, xLabel: 'SESH', yLabel: p.band ? 'Band level' : (p.key === 'block_lb' ? 'Load (lb)' : (p.key === 'marker_core_in' ? 'Distance (in)' : 'Time (sec)')),
            fmt: p.band ? function (v) { return ['', 'Min', 'Med', 'Max'][Math.round(v)] || ''; } : null })
        + '</div>';
    }).join('') + '</div></div>';

  /* 4. Repeatability. round_delta_pct is the recorded last-round minus
     first-round difference, which is the honest existing measure of holding
     performance across a session. */
  const rep = rows.map(function (r) { return r.round_delta_pct == null ? null : Number(r.round_delta_pct); });
  const hasRep = rep.some(function (v) { return v != null; });
  const c4 = '<div class="card"><h2>Repeatability</h2>'
    + '<p class="note">Final recorded round minus first recorded round. Near zero means the score held, positive means the final round scored higher, and negative means it fell.</p>'
    + (hasRep
      ? chart([{ pts: rep, color: '#E9C98F', w: 1.8, primary: true }],
        { count: n, labels: labels, height: 132, xLabel: 'Completed SESHes', yLabel: 'Round delta (pts)', bands: [{ v: 0, label: 'Even' }] })
      : '<p class="note">Needs at least two recorded rounds in a session.</p>')
    + '</div>';

  /* 5. Ceiling vs sustained. Both numbers are recorded, and the gap between
     them is exactly the fatigue story FOBreakdown reads within one session. */
  const bestR = rows.map(function (r) { return r.best_round_pct == null ? null : Number(r.best_round_pct); });
  const c5 = bestR.some(function (v) { return v != null; })
    ? '<div class="card"><h2>Best round against session score</h2>'
    + '<p class="note">Compares the best single round with the full-session score. A smaller gap means the session stayed closer to its strongest round.</p>'
    + chart([
      { pts: bestR, color: '#9FB8A4', w: 1.5 },
      { pts: pct, color: '#E9C98F', w: 1.8, primary: true }
    ], { count: n, labels: labels, min: 0, max: 100, height: 132, xLabel: 'Completed SESHes', yLabel: 'Score %' })
    + legend([{ name: 'Best round', color: '#9FB8A4' }, { name: 'Session score', color: '#E9C98F' }])
    + '</div>'
    : '';

  /* Session history, newest first */
  const hist = '<div class="card"><h2>Recorded SESHes</h2><div class="hist">'
    + rows.slice().reverse().map(function (r) {
      const bits = [];
      if (r.profile_label) bits.push(r.profile_label);
      if (r.block_lb != null) bits.push(r.block_lb + ' lb');
      if (r.band_level) bits.push(r.band_level + ' band');
      if (r.marker_core_in != null) bits.push(r.marker_core_in + '&Prime; marker');
      bits.push(r.sets_logged + '/' + r.sets_total + ' sets');
      const inner = '<img src="/images/badges/' + esc(r.badge_id) + '.png" alt="' + esc(r.badge_name) + '">'
        + '<div><div class="d">' + esc(shortDate(r.session_date)) + ' &middot; ' + esc(r.badge_name) + '</div>'
        + '<div class="p">' + bits.join(' &middot; ') + '</div></div>'
        + '<div class="s">' + Math.round(Number(r.overall_score)) + '%<em>' + esc(r.scoring_version) + '</em></div>';
      /* Replay opens the FOBreakdown rebuilt from the state saved that day.
         Admin only: it lands in FOB Rounds, which is not a member surface. */
      return share
        ? '<div class="hrow">' + inner + '</div>'
        : '<a class="hrow" href="/report-cards.html?perf=' + esc(r.id) + '">' + inner
          + '<span class="go">Open this FOBreakdown &rarr;</span></a>';
    }).join('') + '</div></div>';

  /* Share card. The token is minted server side at render time, so there is no
     mint endpoint for anyone to probe. */
  const shareCard = share ? '' : (function () {
    const tok = SH.create(member.id);
    if (!tok) {
      return '<div class="card"><h2>Share progress</h2>'
        + '<p class="note">Unavailable: SESSION_SECRET is not configured on this deploy.</p></div>';
    }
    const parsed = SH.parse(tok);
    const url = (o.origin || '') + '/fob-share?t=' + tok;
    const revokedNote = member.progress_share_from
      ? '<p class="note" style="margin-top:10px">Links issued before '
        + esc(String(member.progress_share_from).slice(0, 10))
        + ' were revoked. The link above was issued after that, so it works.</p>'
      : '';
    return '<div class="card"><h2>Share progress</h2>'
      + '<p class="note">A read-only link to ' + esc(name) + '&rsquo;s dashboard. It carries their scores and '
      + 'nothing else: no ledger, no balances, no payment detail, no other member, no admin route. '
      + 'Expires ' + esc(parsed ? SH.expiryLabel(parsed) : '') + '.</p>'
      + '<div class="share">'
      + '<textarea id="shareLink" class="lnk" readonly>' + esc(url) + '</textarea>'
      + '<div class="row">'
      + '<button type="button" id="shareCopy">Copy link</button>'
      + '<form method="POST" id="shareRevoke" style="margin:0">'
      + '<input type="hidden" name="revoke" value="1">'
      + '<button class="warn" type="submit">Revoke all links</button></form>'
      + '</div>' + revokedNote + '</div></div>'
      + '<script>(function(){'
      + 'var f=document.getElementById("shareLink"),b=document.getElementById("shareCopy");'
      + 'if(f)f.addEventListener("click",function(){f.select();});'
      + 'if(b)b.addEventListener("click",function(){'
      + 'try{f.select();}catch(e){}'
      + 'var done=function(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy link";},1400);};'
      + 'if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(f.value).then(done,done);}'
      + 'else{try{document.execCommand("copy");}catch(e){}done();}});'
      + 'var r=document.getElementById("shareRevoke");'
      + 'if(r)r.addEventListener("submit",function(e){'
      + 'if(!confirm("Stop every share link already issued for this member?"))e.preventDefault();});'
      + '})();<\/script>';
  })();

  return shell(head
    + '<div class="card"><h2>Career badge</h2>'
    + '<p class="note">Five FOBadges form one score hierarchy. The highlighted badge is the highest tier this member has reached on a completed FOB SESH.</p>'
    + ladder + stats + reads + '</div>'
    + c1 + c2 + c3 + c4 + c5 + hist + shareCard
    + '<p class="foot">One system. Endless applications.</p>');
}

exports.handler = async function (event) {
  if (!S.isAuthed(event)) return { statusCode: 200, headers: H, body: login() };
  const q = (event.queryStringParameters || {});
  const id = String(q.m || '').trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return { statusCode: 200, headers: H, body: shell('<a class="back" href="/fob-payment">&larr; Member ledger</a>'
      + '<div class="card"><div class="empty"><strong>No member selected</strong>Open Progress from a member card in the ledger.</div></div>') };
  }
  try {
    /* Revoke: stamps the cut-off so every share token already issued for this
       member stops validating. Nothing else on the member record is touched. */
    if (event.httpMethod === 'POST' && /(^|&)revoke=1(&|$)/.test(String(event.body || ''))) {
      await P.db('payment_vip_members?id=eq.' + encodeURIComponent(id),
        { method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ progress_share_from: new Date().toISOString() }) });
      return { statusCode: 303, headers: Object.assign({}, H, { Location: '/fob-progress?m=' + encodeURIComponent(id) }), body: '' };
    }

    const mem = await P.db('payment_vip_members?select=id,first_name,last_name,progress_share_from&id=eq.' + encodeURIComponent(id) + '&limit=1');
    if (!mem || !mem.length) {
      return { statusCode: 404, headers: H, body: shell('<a class="back" href="/fob-payment">&larr; Member ledger</a>'
        + '<div class="card"><div class="empty"><strong>Member not found</strong>That member is no longer on the ledger.</div></div>') };
    }
    /* ---- GYM tab. Same member id, separate training system. ---- */
    if (String(q.tab || '') === 'gym') {
      const [sessions, names] = await Promise.all([
        P.db('gym_sessions?select=id,name,session_date,duration_s&member_id=eq.'
          + encodeURIComponent(id) + '&status=eq.done&order=session_date.asc&limit=400'),
        P.db('gym_sets?select=exercise_name&member_id=eq.' + encodeURIComponent(id) + '&limit=4000')
      ]);
      /* Distinct lifts this member has actually performed, so the selector
         never offers an exercise with nothing behind it. */
      const seen = {};
      (names || []).forEach(function (r) { if (r.exercise_name) seen[r.exercise_name] = 1; });
      const exercises = Object.keys(seen).sort();
      const pick = exercises.indexOf(String(q.ex || '')) >= 0 ? String(q.ex) : (exercises[0] || '');
      const sets = pick
        ? await P.db('gym_sets?select=session_date,set_no,weight,reps,time_s,distance,fm_distance,fm_time_s'
            + '&member_id=eq.' + encodeURIComponent(id)
            + '&exercise_name=eq.' + encodeURIComponent(pick)
            + '&order=session_date.asc,set_no.asc&limit=600')
        : [];
      return { statusCode: 200, headers: H,
        body: gymPage(mem[0], sessions || [], sets || [], pick, exercises) };
    }

    const rows = await P.db('fob_performances?select=*&member_id=eq.' + encodeURIComponent(id)
      + '&order=session_date.asc,completed_at.asc&limit=400');
    const h = event.headers || {};
    const proto = h['x-forwarded-proto'] || 'https';
    const host = h['x-forwarded-host'] || h.host || '';
    return { statusCode: 200, headers: H, body: page(mem[0], rows || [], { origin: host ? (proto + '://' + host) : '' }) };
  } catch (e) {
    console.error('fob-progress', e && e.message, e && e.detail);
    return { statusCode: 500, headers: H, body: shell('<div class="card"><div class="empty"><strong>Progress unavailable</strong>The performance store could not be reached.</div></div>') };
  }
};

/* Exported so /fob-share renders the identical dashboard rather than a second,
   drifting copy of it. fob-share.js passes { share: true }. */
module.exports.page = page;
module.exports.shell = shell;
module.exports.TIERS = TIERS;
