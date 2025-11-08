import type { SmsModel, SmsHarmonicPartial, SmsNoiseBand } from '@/features/sound-design/types/sms';
import { generateId } from '@/shared/utils/id';

export type WindowType = 'hann' | 'hamming' | 'blackman';
export interface AnalysisParams {
  fftSize: 1024 | 2048 | 4096;
  hopSize: 256 | 512;
  window: WindowType;
  maxPartials: number;   // 1..32
  noiseBands: number;    // 1..16
}

export async function analyzeFileToSms(file: File, params: AnalysisParams): Promise<SmsModel> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0)); // slice for Safari

  // Mock feature extraction (fast & deterministic enough for prototype)
  // Compute a coarse energy and decide a nominal f0 (220 or 440) just for demo.
  const ch = audioBuffer.getChannelData(0);
  let rms = 0;
  for (let i = 0; i < ch.length; i += Math.floor(ch.length / 2000) || 1) {
    rms += ch[i] * ch[i];
  }
  rms = Math.sqrt(rms / 2000);
  const f0 = rms > 0.02 ? 440 : 220;

  const partialCount = Math.max(1, Math.min(params.maxPartials, 16));
  const partials: SmsHarmonicPartial[] = Array.from({ length: partialCount }, (_, i) => {
    const idx = i + 1;
    const base = 1 / idx;
    // add a small deterministic variation using fftSize + idx
    const jitter = ((params.fftSize + idx * 13) % 7) * 0.01;
    return { idx, amp: Math.max(0, Math.min(1, base - 0.02 * i + jitter)) };
  });

  const bandsCount = Math.max(1, Math.min(params.noiseBands, 8));
  const maxFreq = Math.min(ctx.sampleRate / 2, 16000);
  const step = maxFreq / bandsCount;
  const bands: SmsNoiseBand[] = Array.from({ length: bandsCount }, (_, i) => {
    const freq = (i + 0.5) * step;
    const gain = Math.max(0, Math.min(1, 0.5 - 0.04 * i));
    return { freq, gain };
  });

  const id = generateId('sms');
  const now = Date.now();

  const model: SmsModel = {
    method: 'sms',
    name: file.name.replace(/\.[^/.]+$/, '') || 'Analyzed Model',
    harmonic: { f0, partialCount, partials, decay: 0.5 },
    noise: { tilt: -0.2, bands },
    envelope: { attack: 0.01, release: 0.3 },
    meta: {
      id,
      createdAt: now,
      updatedAt: now,
      tags: ['analyzed'],
      source: { filename: file.name },
    },
  };

  return model;
}