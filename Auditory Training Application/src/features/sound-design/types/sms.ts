export type SynthesisMethod = 'sms';

export interface SmsHarmonicPartial {
  idx: number;      // 1-based partial index
  amp: number;      // 0..1
}

export interface SmsNoiseBand {
  freq: number;     // center frequency in Hz
  gain: number;     // 0..1
}

export interface SmsHarmonicModel {
  f0: number;             // fundamental in Hz
  partialCount: number;   // number of partials considered
  partials: SmsHarmonicPartial[];
  decay?: number;         // optional decay shape 0..1
}

export interface SmsNoiseModel {
  tilt: number;           // -1..1 (negative = darker, positive = brighter)
  bands: SmsNoiseBand[];
}

export interface SmsEnvelope {
  attack: number;         // seconds
  release: number;        // seconds
}

export interface SmsModel {
  method: 'sms';
  name: string;
  harmonic: SmsHarmonicModel;
  noise: SmsNoiseModel;
  envelope: SmsEnvelope;
  meta: {
    id: string;
    createdAt: number;
    updatedAt: number;
    tags: string[];
    source?: { filename: string };
  };
}