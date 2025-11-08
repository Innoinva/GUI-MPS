import type { SmsModel } from '@/features/sound-design/types/sms';

export class WebAudioEngine {
  private audioContext: AudioContext;
  private active: Map<string, { stop: () => void }> = new Map();

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  playTone(frequency: number, amplitude: number, waveform: OscillatorType = 'sine', duration = 1.0): string {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = waveform;
    osc.frequency.value = frequency;
    gain.gain.value = amplitude;

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    const id = `tone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const stop = () => {
      try {
        gain.gain.cancelScheduledValues(this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.02);
        osc.stop(this.audioContext.currentTime + 0.03);
      } catch { /* no-op */ }
      this.active.delete(id);
    };

    this.active.set(id, { stop });

    // Simple envelope
    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(amplitude, this.audioContext.currentTime + 0.01);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
    setTimeout(stop, duration * 1000 + 50);

    return id;
  }

  playSmsModel(model: SmsModel, duration = 1.5, masterGain = 0.6): string {
    const ctx = this.audioContext;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const id = `sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nodes: AudioNode[] = [master];

    // Harmonic part: sum of sines
    const base = model.harmonic.f0;
    const partials = model.harmonic.partials.slice(0, model.harmonic.partialCount);
    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = base * p.idx;
      g.gain.value = masterGain * Math.max(0, Math.min(1, p.amp));
      osc.connect(g);
      g.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + duration + model.envelope.release + 0.1);
      nodes.push(osc, g);
    });

    // Noise part: filtered noise approximation
    if (model.noise.bands.length) {
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;

      // crude tilt: simple high-shelf via biquad shaping by tilt sign
      const filt = ctx.createBiquadFilter();
      filt.type = model.noise.tilt >= 0 ? 'highshelf' : 'lowshelf';
      filt.frequency.value = 2000;
      filt.gain.value = Math.abs(model.noise.tilt) * 12; // +/- 12 dB

      const g = ctx.createGain();
      g.gain.value = masterGain * 0.25;

      src.connect(filt);
      filt.connect(g);
      g.connect(master);

      src.start();
      src.stop(ctx.currentTime + duration);
      nodes.push(src, filt, g);
    }

    // Envelope and stop
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(1, ctx.currentTime + Math.max(0.001, model.envelope.attack));
    master.gain.setTargetAtTime(0, ctx.currentTime + duration, Math.max(0.001, model.envelope.release));

    const stop = () => {
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.02);
      } catch { /* no-op */ }
      nodes.forEach((n: any) => {
        if (typeof n.stop === 'function') {
          try { n.stop(); } catch { /* no-op */ }
        }
      });
      this.active.delete(id);
    };

    this.active.set(id, { stop });
    setTimeout(stop, (duration + model.envelope.release + 0.15) * 1000);

    return id;
  }

  stop(handle: string) {
    const h = this.active.get(handle);
    if (h) h.stop();
  }
}

export const audioEngine = new WebAudioEngine();