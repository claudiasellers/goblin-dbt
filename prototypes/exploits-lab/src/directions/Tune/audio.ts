import type { Sound } from './model';
import type { Pull } from '../../script';

/** Shared mapping so the eyes and ears agree. */
export const baseFreq = (register: number) => 98 * Math.pow(2, register * 1.7); // G2 .. ~C#4
/** Beat rate between the two strings, Hz. Glide pulls the second string up into tune. */
export const beatHz = (s: Sound) => 0.35 + s.rough * (1 - 0.88 * s.glide) * 8;
export const tremHz = (pulse: number) => 0.6 + pulse * 8.5;

function impulse(ctx: BaseAudioContext, secs = 2.8, decay = 2.6) {
  const len = Math.floor(ctx.sampleRate * secs);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function noiseBuffer(ctx: BaseAudioContext) {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

interface Voice { sine: OscillatorNode; saw: OscillatorNode; sineG: GainNode; sawG: GainNode }

/** Two detuned strings + filtered noise + tremolo + a generated-impulse reverb. Silent until started. */
export class TuneAudio {
  ctx: AudioContext;
  private master: GainNode;
  private fx: GainNode;
  private sustain: GainNode;
  private filt: BiquadFilterNode;
  private trem: GainNode;
  private lfo: OscillatorNode;
  private lfoG: GainNode;
  private voices: Voice[] = [];
  private noiseG: GainNode;
  private noiseF: BiquadFilterNode;
  private noise: AudioBufferSourceNode;
  private fifth: OscillatorNode;
  private fifthG: GainNode;
  private disposed = false;
  private last: Sound | null = null;

  constructor() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = (this.ctx = new AC());
    const t = ctx.currentTime;

    this.master = ctx.createGain(); this.master.gain.setValueAtTime(0, t);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
    this.master.connect(comp).connect(ctx.destination);

    // fx bus: dry + reverb
    this.fx = ctx.createGain();
    const dry = ctx.createGain(); dry.gain.value = 0.8;
    const conv = ctx.createConvolver(); conv.buffer = impulse(ctx);
    const wet = ctx.createGain(); wet.gain.value = 0.42;
    this.fx.connect(dry).connect(this.master);
    this.fx.connect(conv).connect(wet).connect(this.master);

    // sustained drone: voices -> lowpass -> tremolo -> level -> fx
    this.filt = ctx.createBiquadFilter(); this.filt.type = 'lowpass'; this.filt.Q.value = 0.7; this.filt.frequency.value = 900;
    this.trem = ctx.createGain(); this.trem.gain.value = 1;
    this.sustain = ctx.createGain(); this.sustain.gain.value = 0;
    this.filt.connect(this.trem).connect(this.sustain).connect(this.fx);

    this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 1;
    this.lfoG = ctx.createGain(); this.lfoG.gain.value = 0;
    this.lfo.connect(this.lfoG).connect(this.trem.gain); this.lfo.start();

    for (let i = 0; i < 2; i++) {
      const sine = ctx.createOscillator(); sine.type = 'sine';
      const saw = ctx.createOscillator(); saw.type = 'sawtooth';
      const sineG = ctx.createGain(); const sawG = ctx.createGain();
      sineG.gain.value = 0.5; sawG.gain.value = 0;
      sine.connect(sineG).connect(this.filt); saw.connect(sawG).connect(this.filt);
      sine.start(); saw.start();
      this.voices.push({ sine, saw, sineG, sawG });
    }

    this.noise = ctx.createBufferSource(); this.noise.buffer = noiseBuffer(ctx); this.noise.loop = true;
    this.noiseF = ctx.createBiquadFilter(); this.noiseF.type = 'bandpass'; this.noiseF.Q.value = 1.4;
    this.noiseG = ctx.createGain(); this.noiseG.gain.value = 0;
    this.noise.connect(this.noiseF).connect(this.noiseG).connect(this.trem); this.noise.start();

    this.fifth = ctx.createOscillator(); this.fifth.type = 'sine';
    this.fifthG = ctx.createGain(); this.fifthG.gain.value = 0;
    this.fifth.connect(this.fifthG).connect(this.fx); this.fifth.start();

    this.master.gain.setTargetAtTime(1, t + 0.02, 0.4);
  }

  /** Glide everything toward a sound. tc is the time constant (~1/3 of the settle time). */
  set(s: Sound, tc = 0.3, glideTc?: number) {
    if (this.disposed) return;
    const ctx = this.ctx; const t = ctx.currentTime;
    const f1 = baseFreq(s.register);
    const detuneNow = 0.35 + s.rough * 8;
    const target = s.glide > 0.5 ? 0.35 + s.rough * 0.12 * 8 : detuneNow; // breathing in -> nearly in tune
    const ftc = glideTc ?? tc;
    const [a, b] = this.voices;
    a.sine.frequency.setTargetAtTime(f1, t, tc); a.saw.frequency.setTargetAtTime(f1, t, tc);
    b.sine.frequency.setTargetAtTime(f1 + target, t, ftc); b.saw.frequency.setTargetAtTime(f1 + target, t, ftc);
    const g = s.grit;
    for (const v of this.voices) {
      v.sineG.gain.setTargetAtTime(0.5 * (1 - 0.75 * g), t, tc);
      v.sawG.gain.setTargetAtTime(0.22 * g, t, tc);
    }
    this.filt.frequency.setTargetAtTime(380 + g * 2600 + s.register * 700 + s.warm * 500, t, tc);
    this.noiseF.frequency.setTargetAtTime(f1 * 5, t, tc);
    this.noiseG.gain.setTargetAtTime(Math.pow(g, 1.6) * 0.16, t, tc);
    const depth = s.pulse * 0.42;
    this.lfo.frequency.setTargetAtTime(tremHz(s.pulse), t, tc);
    this.lfoG.gain.setTargetAtTime(depth, t, tc);
    this.trem.gain.setTargetAtTime(1 - depth, t, tc);
    this.fifth.frequency.setTargetAtTime(f1 * 1.5, t, tc);
    this.fifthG.gain.setTargetAtTime(s.bloom * 0.09, t, 0.8);
    const lvl = (1 - s.hush) * (0.06 + s.loud * 0.2);
    this.sustain.gain.setTargetAtTime(lvl, t, tc);
    this.last = s;
  }

  /** A plucked note routed through the reverb only (not the tremolo). */
  pluck(freq: number, { bright = 0.5, gain = 0.25, decay = 1.4, at = 0 } = {}) {
    if (this.disposed) return;
    const ctx = this.ctx; const t = ctx.currentTime + 0.005 + at;
    const o = ctx.createOscillator(); o.type = bright > 0.6 ? 'sawtooth' : 'triangle'; o.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(800 + bright * 5000, t); f.frequency.exponentialRampToValueAtTime(300 + bright * 600, t + decay);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(f); o2.connect(g2).connect(f); f.connect(g).connect(this.fx);
    o.start(t); o2.start(t); o.stop(t + decay + 0.05); o2.stop(t + decay + 0.05);
  }

  /** The strings flinch when the text arrives. */
  twitch() {
    if (this.disposed) return;
    const t = this.ctx.currentTime; const b = this.voices[1];
    const f = b.sine.frequency.value;
    for (const osc of [b.sine, b.saw]) {
      osc.frequency.cancelScheduledValues(t); osc.frequency.setValueAtTime(f, t);
      osc.frequency.linearRampToValueAtTime(f * 1.06, t + 0.05); osc.frequency.setTargetAtTime(f, t + 0.08, 0.25);
    }
    this.pluck(f * 2, { bright: 0.8, gain: 0.12, decay: 0.5 });
  }

  /** Short sound sketch of each urge. */
  gesture(kind: Pull, root = 196) {
    if (this.disposed) return;
    const r = root;
    if (kind === 'chase') [0, 1, 2, 3].forEach(i => this.pluck(r * Math.pow(2, (i * 3) / 12), { bright: 0.5, gain: 0.18, decay: 0.35, at: i * 0.16 }));
    if (kind === 'fight') { this.pluck(r * 0.75, { bright: 1, gain: 0.38, decay: 0.28 }); this.pluck(r * 0.75 * 1.06, { bright: 1, gain: 0.2, decay: 0.2 }); }
    if (kind === 'hide') [0, 1, 2, 3, 4].forEach(i => this.pluck(r * Math.pow(2, -i * 2 / 12), { bright: 0.2, gain: 0.2 * Math.pow(0.5, i), decay: 0.9, at: i * 0.32 }));
    if (kind === 'blank') {
      const ctx = this.ctx; const t = ctx.currentTime + 0.01;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = r * 0.5;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
      g.gain.setValueAtTime(0.12, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.74);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.8);
    }
  }

  /** Harp strum across a list of frequencies. */
  strum(freqs: number[], gap = 0.07) {
    freqs.forEach((f, i) => this.pluck(f, { bright: 0.35, gain: 0.14, decay: 2.2, at: i * gap }));
  }

  get current() { return this.last; }

  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 0.35);
    await new Promise(r => setTimeout(r, 420));
    try { await this.ctx.close(); } catch { /* already closed */ }
  }
}
