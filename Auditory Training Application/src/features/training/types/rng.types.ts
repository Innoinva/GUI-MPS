export type TemplateType = 'letter' | 'frequency';
export type ToneMode = 'static' | 'contour';

/* Templates */
export interface ScaleTemplate {
  id: string;
  name: string;
  type: TemplateType;
  letters?: string[];   // e.g., ["C","C#","D",...]
  freqsHz?: number[];   // absolute frequencies
  builtIn?: boolean;    // true for defaults; user templates omit or false
}

/* Probability and scheduling */
export interface ProbabilitySpec {
  kind: 'uniform' | 'custom';
  weights?: number[];     // per resolved item weight (>=0)
  repeatCount?: number;   // optional global repeat directive
}

export interface DurationSpec {
  minSec: number;
  maxSec: number;
  randomized: boolean;
}

export interface GapSpec {
  minSec: number;
  maxSec: number;
  randomized: boolean;
  advanceOnResponse: boolean;
  cutOffOnResponse: boolean;
}

export interface OutputRateSpec {
  minPerSec: number;  // 1..40
  maxPerSec: number;  // 1..40
}

/* Octaves */
export interface OctaveSpec {
  singleOctaves: number[];          // allowed 1..10
  chordOctaves: number[];           // allowed 1..10
  sameForSingleAndChord: boolean;   // UX toggle
}

/* Contour / Tone Shape */
export interface NormalizedPoint { t: number; v: number }  // 0..1, 0..1

export interface ContourCurve {
  startHz: number;
  endHz: number;
  shape: 'linear' | 'exp' | 'sine' | 'custom';
  points?: NormalizedPoint[];   // custom keyframes (normalized)
}

export type ToneShapeSpec =
  | { mode: 'static' }
  | { mode: 'contour'; curve: ContourCurve };

/* Contour overrides */
export interface ContourOverrides {
  single: Record<string, ContourCurve>;          // RNGItem.id
  chordGroup: Record<string, ContourCurve>;      // chordId
  chordPerNote: Record<string, ContourCurve>;    // `${chordId}::${memberKey}`
  comboGroup?: Record<string, ContourCurve>;     // comboBaseId
  comboPerNote?: Record<string, ContourCurve>;   // `${comboBaseId}::${noteIndex}`
}

/* Sound Models filter and assignment */
export interface ModelFilter {
  selectedModelIds: string[];  // empty => all allowed
}

export type ModelAssignmentPolicy = 'same' | 'roundRobin' | 'byIndex';

export interface ModelAssignmentSpec {
  policy: ModelAssignmentPolicy;
  byIndex?: string[];             // when policy === 'byIndex' (voice 1 -> byIndex[0])
  defaultModelId?: string | null; // fallback when there are no selected models
}

/* Polyphony and chords */
export interface RNGChordMember {
  itemRefId?: string;  // reference to RNGItem.id
  freqHz?: number;     // ad-hoc frequency not tied to items
  label?: string;      // optional label for UI
}

export interface RNGChord {
  id: string;
  name: string;
  members: RNGChordMember[];   // 2..12 recommended
}

export interface PolyphonySpec {
  enabled: boolean;
  k: number;                        // 1..12 (UI clamps 2..12 for simultaneous)
  source: 'combinations' | 'chords' | 'both';
  maxButtons?: number;              // optional UI/pagination limit
}

/* Octave Policies */
export type OctavePolicyMode = 'global' | 'uniform' | 'relative' | 'independent';

export interface OctavePolicyGlobal {
  mode: 'global';
}

export interface OctavePolicyUniform {
  mode: 'uniform';
  octaves: number[]; // allowed octaves for the entire combo/chord
}

export interface OctavePolicyRelative {
  mode: 'relative';
  rootIndex: number;      // 1..k
  rootOctaves: number[];  // allowed octaves for root
  offsets: number[];      // per-note octave offsets relative to root (length = k)
}

export interface OctavePolicyIndependent {
  mode: 'independent';
  allowed: Record<number, number[]>; // allowed[1] = octaves for note index 1, etc.
}

export type OctavePolicy =
  | OctavePolicyGlobal
  | OctavePolicyUniform
  | OctavePolicyRelative
  | OctavePolicyIndependent;

/* Main RNG config */
export interface RNGConfig {
  templateId: string | null;
  selectedIndices: number[];
  octave: OctaveSpec;

  toneShape: ToneShapeSpec;
  contourOverrides: ContourOverrides;

  duration: DurationSpec;
  gap: GapSpec;
  outputRate: OutputRateSpec;

  probability: ProbabilitySpec;
  polyphony: PolyphonySpec;

  modelFilter: ModelFilter;
  modelAssignment: ModelAssignmentSpec;

  tuningSystemId?: string | null;
}

/* Derived items and combinations */
export interface RNGItem {
  id: string;       // e.g., pc-<idx>-o<oct> or f-<hz>
  label: string;    // "C#4" or "440.00 Hz"
  freqHz: number;   // resolved Hz
}

/* Generic combination record used for both resolved and base (octave-agnostic) combos */
export interface RNGCombination {
  id: string;
  itemIds: string[];
  labels: string;
}