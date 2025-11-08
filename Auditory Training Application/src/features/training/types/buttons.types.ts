export type ButtonShape = 'circle' | 'oval' | 'square' | 'rect' | 'custom';

export interface ButtonEnvelope {
  attackMs?: number;
  releaseMs?: number;
  curve?: 'linear' | 'exp';
}

export interface ButtonVoice {
  modelId: string | null;
  gainDb?: number;
  pan?: number;
  envelope?: ButtonEnvelope;
}

export interface ButtonAppearance {
  sizePx?: number;                     // unrestricted numeric size (px)
  shape?: ButtonShape;
  shapePath?: string;                  // SVG path when shape === 'custom'
  color?: string;                      // hex or token
  border?: { enabled: boolean; color?: string; thickness?: number };
}

export interface ButtonBehavior {
  trigger?: 'momentary' | 'latch' | 'toggle';
  retrigger?: 'restart' | 'ignore' | 'legato';
  reactiveColor?: { mode: 'off' | 'on-correct'; durationMs: number };
  lightFeedback?: { mode: 'off' | 'constant' | 'on-correct'; durationMs: number };
}

export interface ButtonLayout {
  x: number;
  y: number;
  w?: number;
  h?: number;
  groupId?: string;
}

export interface ButtonDefinition {
  id: string;
  label: string;
  linkedFromRng: boolean;
  rngRef?: { type: 'single' | 'combo' | 'chord'; id: string };
  freqHz: number[];              // length = voices count
  voices: ButtonVoice[];         // length equals freqHz.length
  appearance?: ButtonAppearance;
  behavior?: ButtonBehavior;
  layout?: ButtonLayout;
  tags?: string[];
}