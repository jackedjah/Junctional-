/* FOB true-pitch shifter — AudioWorkletProcessor
   ---------------------------------------------------------------------------
   Transposes the mah player signal WITHOUT changing its duration, so pitch is
   an axis of its own alongside the tape-speed tempo control. The speed slider
   keeps its cassette behaviour (playbackRate with pitch preservation off);
   this node adds a further transposition on top of whatever the tape is doing.

   R38 — WHY THE PHASE VOCODER WAS REMOVED
   Every build from the original engine through R37 transposed by moving energy
   between FFT bins and rebuilding synthesis phase. R36 added identity/peak
   phase locking; R37 replaced rounded bin scatter with continuous output-driven
   spectral resampling. Both measured better and both FAILED the physical iPhone
   ear test with the same verdict: muddy, fuzzy, "like an old radio".

   R38 measured why, against the one reference the listener already accepts as
   clean: the native decoder path (playbackRate with preservesPitch=false).
   Native resampling is a mathematically EXACT transposition -- the decoded
   waveform is resampled, so its spectrum is the source spectrum scaled in
   frequency by exactly the ratio, nothing added and nothing removed. It cannot
   be the product answer because it also divides duration by the ratio, but its
   spectral shape is precisely what a correct true-pitch engine must produce.
   Rendering audio/fob-training-theme.mp3 through both and comparing long-term
   average spectra gave a mean absolute error, relative to that reference, of
   1.4-2.7 dB spread evenly across EVERY band from 80Hz to 16kHz on upshifts,
   and 10-23 dB of spurious content above 8kHz on downshifts. The same
   measurement with the worklet alone and with the full pitch-only lane
   (headroom -> worklet -> limiter -> master) agreed to within 0.05 dB, which
   exonerates the surrounding graph, the 0.58 headroom gain and the limiter:
   the coloration is generated inside the processor.

   That error is broadband and structural, not a missed heuristic. Direct
   spectral-bin transposition rescales the analysis window's own mainlobe and
   leakage skirts along with the partial it is moving, so a resynthesised
   partial no longer has the spectral shape the synthesis window expects. No
   amount of phase locking or magnitude interpolation repairs that, which is
   exactly why two consecutive well-measured passes still sounded wrong.

   R38 ARCHITECTURE — RESAMPLE, THEN RESTORE THE DURATION
   The listener's own evidence names the fix. Resampling sounds clean, so do
   the resampling, and undo the side effect instead of avoiding the technique:

     time-stretch the input by the pitch ratio   (duration * ratio, pitch same)
     then resample it by the same ratio          (duration / ratio, pitch * ratio)

   The duration factors cancel exactly, by construction rather than by
   correction, and the transposition itself is performed by the interpolator --
   the same operation the native reference uses and the reason it sounds clean.

   The stretch is WSOLA (waveform-similarity overlap-add), a time-domain
   method: fixed synthesis hops of Hann-windowed segments at 50% overlap, where
   each segment is drawn from the position, within a bounded search, whose
   waveform best continues what the previous segment already emitted. There is
   no spectral decomposition anywhere in the signal path, so none of the phase
   vocoder's failure modes exist to be tuned: no bin collisions, no spectral
   holes, no combing, no phasiness, no window rescaling. Hann at exactly 50%
   overlap sums to unity, so the output gain is 1.0 by construction and needs no
   calibration constant -- the class of bug that shipped hard clipping in v386.

   STEREO is shared, not independent: the similarity search runs once on the
   mono sum and both channels are cut at the SAME offset. Inter-channel phase
   is therefore preserved bit-for-bit rather than reconstructed per channel,
   which is what the previous architecture could not guarantee.

   A RATIO CHANGE IS A PARAMETER CHANGE. The ratio only sets the analysis hop
   (Hs/ratio) and the interpolator's read increment. Nothing is rebuilt, reset
   or reallocated when the slider moves, so a live drag stays click-free.

   R39 — PHYSICAL FIDELITY CLOSURE
   R38 still failed the real iPhone ear test because its broad Hann crossfade
   continuously mixed two displaced waveform excerpts. The steady-sine level
   test could not see that: a periodic sine aligns perfectly, while music
   contains transients and broadband detail whose high-frequency phase does not.
   On the real theme fixture, R38 measured 7–11% loss of normalized transient
   slope through much of the range, 8–15% short-window centroid loss at several
   shifts, and roughly 1.7–2.0 dB broadband-noise loss. That is temporal
   averaging/comb cancellation, heard physically as dull/old-radio coloration.

   R39 keeps the same single WSOLA owner and duration-cancelling architecture,
   but removes the measured mechanisms instead of EQ-compensating them:
   - a steeper complementary overlap spends far less time at a 50/50 blend,
     preserving attacks and upper-band phase while still summing to unity;
   - similarity alignment combines waveform correlation with first-difference
     correlation, so low-frequency energy cannot dominate the cut decision and
     cancel treble/transient detail;
   - Catmull-Rom is replaced by a 24-tap, 256-phase anti-aliased polyphase sinc
     resampler. The table is built once when the worklet module loads; steady
     rendering performs indexed multiply-adds only, with no per-sample allocation.

   Latency remains FRAME + SEARCH samples, reported to the main thread so the
   beat-sync clock compensates. Ratio changes still mutate one k-rate parameter;
   no graph/node rebuild occurs during Pitch gestures. */

/* ~21ms at 48k / ~23ms at 44.1k. SYN_HOP stays at FRAME/2 so every source
   region remains covered across the supported ±12 ST range. R39 changes the
   complementary crossfade shape, not the 50% coverage geometry. */
const FRAME = 1024;
const SYN_HOP = FRAME >> 1;                 /* 512 — 50% coverage geometry */
/* +/-256 samples (~5ms) of freedom for the waveform-similarity search. This is
   the whole quality mechanism: it is what aligns each emitted segment with the
   one before it instead of butt-joining unrelated phase. */
const SEARCH = 256;
/* Correlation window. One synthesis hop of context is enough to identify the
   right alignment without paying for the whole frame. */
const CORR = SYN_HOP;
/* Coarse search stride. The correlation surface is smooth at this scale, so a
   stride-4 sweep followed by a +/-4 fine refinement finds the same peak as an
   exhaustive search for about a quarter of the cost. */
const COARSE = 4;
/* Input must lead the analysis cursor by the widest window the search can
   reach, PLUS a margin. The margin is not cosmetic: in steady state the writer
   runs exactly FRAME+SEARCH ahead of the analysis cursor, which is precisely
   the emit guard's threshold, so the Math.round() of a fractional analysis
   position could push it under by a sample and starve the frame. A starved
   sample is an audible click, and a ratio sweep hits that boundary repeatedly.
   MARGIN keeps the guard strictly satisfied whatever the rounding does. */
const MARGIN = 64;
const LEAD = FRAME + SEARCH + MARGIN;       /* 1344 */
/* Fraction of the writer/analysis lead error corrected per emitted frame.
   anaPos is an integrator, so a ratio change leaves the lead off target and it
   would otherwise wander until a frame starves. Correcting a small share of the
   error each frame pulls it back within a few frames, and the correction is
   absorbed by the similarity search -- realigning the cut point is precisely
   what that search already does every frame, so the regulation is inaudible.
   Duration is unaffected: process() emits exactly one output sample per input
   sample regardless of which input the analysis reads. */
const LEAD_TRIM = 0.06;
const NEUTRAL_SEMITONES = 0.02;             /* below this, pass straight through */
/* Crossfade between the delayed dry tap and the processed signal when the
   neutral threshold is crossed. The two paths carry the same audio at the same
   latency but not at the same phase -- the similarity search cuts the wet path
   anywhere within +/-SEARCH -- so switching between them in one sample is a
   step discontinuity. Measured: the single worst discontinuity in a full slider
   sweep occurred exactly at the neutral crossing, not anywhere in the pitched
   range. ~11ms is short enough to stay imperceptible as a transition and long
   enough to remove the step. */
const XFADE = 512;
const TWO_PI = Math.PI * 2;

/* Ring sizes are powers of two so indexing is a mask, never a modulo. IN_RING
   must span the widest reach of one frame: at the minimum ratio 0.25 the
   analysis hop is SYN_HOP/0.25 = 2048, so the previous frame's correlation
   template can sit ~2304 samples behind the current search window while the
   writer runs LEAD ahead of it. 8192 clears that with margin. */
const IN_RING = 8192, IN_MASK = IN_RING - 1;
const OUT_RING = 4096, OUT_MASK = OUT_RING - 1;

/* R39 allocation-free polyphase windowed-sinc resampler table. */
const RES_TAPS=24, RES_HALF=12, RES_PHASES=256, RES_BINS=49, RES_MIN_CUTOFF=0.25;
const RES_TABLE=new Float32Array(RES_BINS*RES_PHASES*RES_TAPS);
for(let rb=0;rb<RES_BINS;rb++){
  const cutoff=1-(1-RES_MIN_CUTOFF)*(rb/(RES_BINS-1));
  for(let ph=0;ph<RES_PHASES;ph++){
    const frac=ph/RES_PHASES; let norm=0; const base=(rb*RES_PHASES+ph)*RES_TAPS;
    for(let ti=0;ti<RES_TAPS;ti++){ const k=ti-(RES_HALF-1), x=k-frac, ax=Math.abs(x); let w=0;
      if(ax<RES_HALF){ const z=cutoff*x, p=Math.PI*z, si=Math.abs(p)<1e-8?1:Math.sin(p)/p; const win=0.5+0.5*Math.cos(Math.PI*x/RES_HALF); w=cutoff*si*win; }
      RES_TABLE[base+ti]=w; norm+=w;
    }
    if(Math.abs(norm)>1e-12)for(let ti=0;ti<RES_TAPS;ti++)RES_TABLE[base+ti]/=norm;
  }
}

class FobPitchProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'ratio',
      defaultValue: 1,
      minValue: 0.25,   /* -24 semitones */
      maxValue: 4,      /* +24 semitones */
      automationRate: 'k-rate'   /* a shift is a segment/read-rate decision made
                                    once per frame, not a per-sample gain */
    }];
  }

  constructor() {
    super();
    /* R39 steep complementary overlap. For every i, the incoming and outgoing
       halves sum to exactly 1.0, preserving unity gain, but the fourth-power
       law narrows the ambiguous 50/50 blend region that cancelled broadband
       detail in R38. */
    this.window = new Float32Array(FRAME);
    for (let i = 0; i < SYN_HOP; i++) {
      const t=(i+0.5)/SYN_HOP, a=Math.sin(Math.PI*0.5*t), b=Math.cos(Math.PI*0.5*t);
      const a4=a*a*a*a, b4=b*b*b*b, w=a4/(a4+b4);
      this.window[i]=w; this.window[i+SYN_HOP]=1-w;
    }

    this.channels = [];
    /* Mono sum of the input, maintained incrementally so the similarity search
       reads one contiguous array instead of re-summing channels per lag. This
       is what makes both channels share one cut point. */
    this.monoRing = new Float32Array(IN_RING);

    this.writePos = 0;    /* absolute count of input samples received */
    this.anaPos = 0;      /* absolute ideal analysis position (fractional) */
    this.prevPos = 0;     /* absolute position the previous frame was cut from */
    this.outWrite = 0;    /* absolute end of the finished stretched stream */
    this.readPos = 0;     /* fractional read cursor into the stretched stream */
    this.primed = false;
    this.firstFrame = true;
    /* 1 = fully dry (neutral), 0 = fully processed. */
    this.dryMix = 1;
    /* Processed samples produced since the engine last left the parked neutral
       state. The engine restarts with empty overlap-add accumulators, so its
       first FRAME samples ramp up through one Hann window and are NOT yet at
       full amplitude. Crossfading into that ramp leaves a step where the fade
       ends. The mix therefore holds fully dry until the engine is warm. */
    this.warm = 0;

    /* v382 lifetime control. process() returning true keeps a processor alive
       for the whole life of the AudioContext even after its node is
       disconnected and dereferenced, so a node that is thrown away without
       being released leaves a full engine running on the audio thread forever.
       Every one of those steals render-quantum budget and is the direct cause
       of playback degrading the longer a member uses the Studio. The engine
       posts 'release' before dropping a node; process() then returns false
       exactly once and the browser collects the processor. */
    this.released = false;
    try {
      this.port.onmessage = (function (self) {
        return function (ev) {
          var data = ev && ev.data;
          if (data && data.type === 'release') self.released = true;
          else if (data && data.type === 'reset') self.resetState();
        };
      })(this);
    } catch (e) {}

    this.port.postMessage({ type: 'ready', latency: LEAD / sampleRate, fftSize: FRAME });
  }

  resetState() {
    this.writePos = 0; this.anaPos = 0; this.prevPos = 0;
    this.outWrite = 0; this.readPos = 0;
    this.primed = false; this.firstFrame = true;
    this.dryMix = 1; this.warm = 0;
    this.monoRing.fill(0);
    for (let i = 0; i < this.channels.length; i++) {
      const ch = this.channels[i];
      ch.inRing.fill(0); ch.outRing.fill(0); ch.delay.fill(0); ch.delayIndex = 0; ch.last = 0;
    }
  }

  ensureChannels(n) {
    while (this.channels.length < n) {
      this.channels.push({
        inRing: new Float32Array(IN_RING),
        outRing: new Float32Array(OUT_RING),
        /* Dry path held at the same latency as the wet path, so the neutral
           position is uncoloured and toggling pitch never jumps position. */
        delay: new Float32Array(LEAD + 1),
        delayIndex: 0,
        /* Last emitted sample. A starve must hold this, never fall to zero:
           a zero sample inside continuous audio is a click. */
        last: 0
      });
    }
  }

  /* WSOLA similarity search. Returns the absolute input position, within
     +/-SEARCH of base, whose waveform best continues the segment the previous
     frame emitted. The template is the natural continuation of that segment:
     the input SYN_HOP samples after where it was cut from.

     Normalising by the candidate's own energy is deliberate. A raw dot product
     is maximised by whatever is loudest in the search window, which drags the
     cut toward transients and repeats them; normalising selects the best SHAPE
     match at any level, which is the property that keeps the waveform
     continuous and is the entire reason WSOLA sounds better than plain OLA. */
  findBestPos(base, templateAt) {
    const mono = this.monoRing;
    let bestOff = 0, bestScore = -Infinity;

    /* Coarse sweep: stride-4 lags, stride-4 taps. */
    for (let off = -SEARCH; off <= SEARCH; off += COARSE) {
      let dot = 0, energy = 0, ddot = 0, denergy = 0;
      const start = base + off;
      for (let i = COARSE; i < CORR; i += COARSE) {
        const a = mono[(start + i) & IN_MASK], ap = mono[(start + i - COARSE) & IN_MASK];
        const b = mono[(templateAt + i) & IN_MASK], bp = mono[(templateAt + i - COARSE) & IN_MASK];
        const da=a-ap, db=b-bp; dot += a * b; energy += a * a; ddot += da*db; denergy += da*da;
      }
      const score = 0.35*(dot / Math.sqrt(energy + 1e-9)) + 0.65*(ddot / Math.sqrt(denergy + 1e-9));
      if (score > bestScore) { bestScore = score; bestOff = off; }
    }

    /* Fine refinement around the coarse winner, full tap resolution. */
    const lo = Math.max(-SEARCH, bestOff - COARSE), hi = Math.min(SEARCH, bestOff + COARSE);
    let fineOff = bestOff; bestScore = -Infinity;
    for (let off = lo; off <= hi; off++) {
      let dot = 0, energy = 0, ddot = 0, denergy = 0;
      const start = base + off;
      for (let i = 1; i < CORR; i++) {
        const a = mono[(start + i) & IN_MASK], ap = mono[(start + i - 1) & IN_MASK];
        const b = mono[(templateAt + i) & IN_MASK], bp = mono[(templateAt + i - 1) & IN_MASK];
        const da=a-ap, db=b-bp; dot += a * b; energy += a * a; ddot += da*db; denergy += da*da;
      }
      const score = 0.35*(dot / Math.sqrt(energy + 1e-9)) + 0.65*(ddot / Math.sqrt(denergy + 1e-9));
      if (score > bestScore) { bestScore = score; fineOff = off; }
    }
    return base + fineOff;
  }

  /* Emit one complementary-windowed segment into the stretched stream.
     Synthesis positions remain fixed multiples of SYN_HOP; paired overlap
     weights sum to unity while the sharper R39 law reduces phase cancellation. */
  emitFrame(channels) {
    const base = Math.round(this.anaPos);
    let pos;
    if (this.firstFrame) { pos = base; this.firstFrame = false; }
    else pos = this.findBestPos(base, this.prevPos + SYN_HOP);
    this.prevPos = pos;

    const win = this.window, outW = this.outWrite;
    for (let c = 0; c < channels; c++) {
      const ch = this.channels[c], inR = ch.inRing, outR = ch.outRing;
      /* The second half has not been written by the immediately previous frame,
         so clear it before accumulating; the first half carries that frame's
         complementary tail. */
      for (let i = SYN_HOP; i < FRAME; i++) outR[(outW + i) & OUT_MASK] = 0;
      for (let i = 0; i < FRAME; i++) {
        outR[(outW + i) & OUT_MASK] += win[i] * inR[(pos + i) & IN_MASK];
      }
    }
    this.outWrite = outW + SYN_HOP;
  }

  /* R39 polyphase sinc resampling: the weights are prepared once at module load,
     so steady-state rendering is only indexed multiply-adds. */
  static interp(ring, posInt, frac, ratio) {
    const cutoff=ratio>1?Math.max(RES_MIN_CUTOFF,1/ratio):1;
    const rb=Math.max(0,Math.min(RES_BINS-1,Math.round((1-cutoff)/(1-RES_MIN_CUTOFF)*(RES_BINS-1))));
    const ph=Math.max(0,Math.min(RES_PHASES-1,Math.round(frac*(RES_PHASES-1))));
    const base=(rb*RES_PHASES+ph)*RES_TAPS; let y=0;
    for(let ti=0;ti<RES_TAPS;ti++)y+=ring[(posInt+ti-(RES_HALF-1))&OUT_MASK]*RES_TABLE[base+ti];
    return y;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || !output.length) return !this.released;

    /* Released nodes emit one quantum of silence and then stop being scheduled
       at all. This is the only path that ends a processor's life. */
    if (this.released) {
      for (let c = 0; c < output.length; c++) output[c].fill(0);
      return false;
    }

    const ratioParam = parameters && parameters.ratio;
    const raw = ratioParam && ratioParam.length ? ratioParam[0] : 1;
    const ratio = raw > 0 ? raw : 1;

    if (!input || !input.length || !input[0] || !input[0].length) {
      for (let c = 0; c < output.length; c++) output[c].fill(0);
      return true;
    }

    /* HTML media is at most stereo here. Keeping the worklet to two channels
       bounds the realtime cost on iPhone; extra outputs mirror the last
       processed channel below. */
    const channels = Math.min(input.length, output.length, 2);
    this.ensureChannels(channels);

    const semitones = Math.abs(Math.log(ratio) / Math.LN2) * 12;
    const bypass = semitones < NEUTRAL_SEMITONES;
    const frames = output[0].length;
    /* Analysis advances by SYN_HOP/ratio per frame; frames are consumed at
       ratio per output sample. The product is exactly one input sample per
       output sample, so in STEADY STATE the writer/analysis lead is invariant.
       It is not invariant across a ratio change: anaPos is an integrator, and
       changing the ratio changes how fast frames are consumed, so the lead
       wanders during a sweep. Measured across one full -12..+12 traversal it
       ranged 442..1560 against a guard that needs 1280, i.e. it starved frames
       and produced clicks. emitFrame() therefore regulates it (see LEAD_TRIM). */
    const anaHop = SYN_HOP / ratio;

    for (let i = 0; i < frames; i++) {
      /* Ingest one sample per channel, maintaining the shared mono sum. */
      let mono = 0;
      for (let c = 0; c < channels; c++) {
        const ch = this.channels[c];
        const sample = input[c][i];
        ch.inRing[this.writePos & IN_MASK] = sample;
        mono += sample;
        /* latency-matched dry tap */
        ch.delay[ch.delayIndex] = sample;
        ch.delayIndex = ch.delayIndex + 1 > LEAD ? 0 : ch.delayIndex + 1;
      }
      this.monoRing[this.writePos & IN_MASK] = channels > 1 ? mono * 0.5 : mono;
      this.writePos++;

      const targetMix = bypass ? 1 : 0;
      /* Fading back TO dry needs no warm-up; dry is always available. */
      if (this.dryMix < targetMix) this.dryMix = Math.min(targetMix, this.dryMix + 1 / XFADE);

      if (this.dryMix >= 1 && targetMix >= 1) {
        /* Fully neutral: the engine is parked and costs nothing. Its cursors are
           still held at the correct lead behind the writer, so engaging pitch
           after a long neutral stretch starts from current audio rather than a
           stale window, and the first processed sample is available at once. */
        this.anaPos = this.writePos - LEAD;
        this.prevPos = this.anaPos;
        this.outWrite = 0; this.readPos = 0;
        this.primed = this.writePos >= LEAD; this.firstFrame = true;
        for (let c = 0; c < channels; c++) {
          const ch = this.channels[c];
          const d = ch.delayIndex - LEAD;
          output[c][i] = ch.last = ch.delay[d < 0 ? d + LEAD + 1 : d];
        }
        this.warm = 0;
        continue;
      }

      if (!this.primed) {
        /* One-time fill of the LEAD the search needs. The dry delay line is
           the same length and is also still filling, so both paths agree. */
        if (this.writePos >= LEAD) {
          this.primed = true;
          this.anaPos = this.writePos - LEAD;
          this.prevPos = Math.round(this.anaPos);
          this.firstFrame = true;
          this.outWrite = 0; this.readPos = 0;
        } else {
          for (let c = 0; c < channels; c++) output[c][i] = this.channels[c].last;
          continue;
        }
      }

      /* Produce stretched samples until the interpolator's 4-tap window is
         fully resolved, then read one output sample from it. */
      let guard = 0;
      while (this.outWrite <= this.readPos + 2 && guard++ < 8) {
        if (this.writePos < Math.round(this.anaPos) + SEARCH + FRAME) break;
        this.emitFrame(channels);
        this.anaPos += anaHop;
        /* Regulate the lead back toward LEAD (see LEAD_TRIM). */
        this.anaPos += ((this.writePos - this.anaPos) - LEAD) * LEAD_TRIM;
        /* Hard floor. The servo corrects only when a frame is emitted, so a
           burst of frames during a fast ratio change can still carry the lead
           under what the search window needs before the next correction lands.
           Clamping here makes a starved frame -- and the click it causes --
           structurally impossible rather than statistically unlikely. Like the
           servo, the position change is absorbed by the similarity search. */
        const floor = this.writePos - (SEARCH + FRAME);
        if (this.anaPos > floor) this.anaPos = floor;
      }
      if (this.outWrite <= this.readPos + 2) {
        /* Starvation is designed out by MARGIN, but hold the last sample if it
           ever happens rather than punching a zero into continuous audio. */
        for (let c = 0; c < channels; c++) output[c][i] = this.channels[c].last;
        continue;
      }

      /* The engine has produced a sample, so it is one sample warmer. Only
         once a complete overlap frame exists may the neutral crossfade move wet. */
      if (this.warm < FRAME) this.warm++;
      else if (this.dryMix > targetMix) this.dryMix = Math.max(targetMix, this.dryMix - 1 / XFADE);
      const mix = this.dryMix;

      const posInt = Math.floor(this.readPos), frac = this.readPos - posInt;
      for (let c = 0; c < channels; c++) {
        const ch = this.channels[c];
        const wet = FobPitchProcessor.interp(ch.outRing, posInt, frac, ratio);
        if (mix > 0) {
          const d = ch.delayIndex - LEAD;
          const dry = ch.delay[d < 0 ? d + LEAD + 1 : d];
          output[c][i] = ch.last = dry * mix + wet * (1 - mix);
        } else {
          output[c][i] = ch.last = wet;
        }
      }
      this.readPos += ratio;

      /* Keep the absolute cursors bounded so long sessions never lose float
         precision. Rebasing by a multiple of both ring sizes leaves every
         masked index and the fractional part untouched. */
      if (this.readPos >= 0x40000000) {
        const rebase = 0x20000000;
        this.readPos -= rebase; this.outWrite -= rebase;
      }
      if (this.writePos >= 0x40000000) {
        const rebase = 0x20000000;
        this.writePos -= rebase; this.anaPos -= rebase; this.prevPos -= rebase;
      }
    }

    for (let c = channels; c < output.length; c++) output[c].set(output[Math.max(0, channels - 1)]);
    return true;
  }
}

registerProcessor('fob-pitch', FobPitchProcessor);
