import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  RNGConfig,
  RNGItem,
  RNGCombination,
  ScaleTemplate,
  ContourCurve,
  RNGChord,
  RNGChordMember,
  OctavePolicy,
} from '../types/rng.types';
import { combinationsLex } from '../utils/combos';

/* ===== Pitch helpers (12‑TET, A4=440) ===== */
function canonicalPc(name: string): string {
  const s = name.trim().toUpperCase().replace('♯', '#').replace('♭', 'B');
  const map: Record<string, string> = { DB: 'C#', EB: 'D#', GB: 'F#', AB: 'G#', BB: 'A#' };
  return map[s] || s;
}
function pcToSemitone(pc: string): number {
  const m: Record<string, number> = {
    C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6,
    G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
  };
  const k = canonicalPc(pc);
  if (!(k in m)) throw new Error(`Unknown pitch class: ${pc}`);
  return m[k];
}
function noteToHz(pc: string, octave: number, a4 = 440): number {
  const semitone = pcToSemitone(pc);
  const midi = (octave + 1) * 12 + semitone; // C-1 = 0
  return a4 * Math.pow(2, (midi - 69) / 12);
}

const WESTERN_PITCH_CLASSES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;
const OCT4_FREQS = [
  261.625565, 277.182631, 293.664768, 311.126984, 329.627557, 349.228231,
  369.994423, 391.995436, 415.304698, 440.0, 466.163762, 493.883301,
];

/* ===== Templates ===== */
type TemplateMap = Record<string, ScaleTemplate>;
const defaultTemplates: TemplateMap = {
  'tpl-western-letter': {
    id: 'tpl-western-letter',
    name: 'Western 12TET (Pitch Classes)',
    type: 'letter',
    letters: [...WESTERN_PITCH_CLASSES],
    builtIn: true,
  },
  'tpl-western-freq-oct4': {
    id: 'tpl-western-freq-oct4',
    name: 'Western 12TET (Octave 4 Frequencies)',
    type: 'frequency',
    freqsHz: [...OCT4_FREQS],
    builtIn: true,
  },
};

/* ===== Defaults ===== */
function defaultConfig(): RNGConfig {
  return {
    templateId: 'tpl-western-letter',
    selectedIndices: [],
    octave: { singleOctaves: [4], chordOctaves: [4], sameForSingleAndChord: true },

    toneShape: { mode: 'static' },
    contourOverrides: { single: {}, chordGroup: {}, chordPerNote: {}, comboGroup: {}, comboPerNote: {} },

    duration: { minSec: 0.3, maxSec: 0.5, randomized: false },
    gap: { minSec: 0.3, maxSec: 0.5, randomized: false, advanceOnResponse: false, cutOffOnResponse: false },
    outputRate: { minPerSec: 1, maxPerSec: 4 },

    probability: { kind: 'uniform' },
    polyphony: { enabled: false, k: 2, source: 'combinations', maxButtons: 200 },

    modelFilter: { selectedModelIds: [] },
    modelAssignment: { policy: 'roundRobin', defaultModelId: null },

    tuningSystemId: null,
  };
}

/* ===== Store state ===== */
interface RNGState {
  templates: TemplateMap;
  config: RNGConfig;

  items: RNGItem[];
  combos: RNGCombination[];
  combosBase: RNGCombination[];

  chords: RNGChord[];

  comboOctavePolicies: Record<string, OctavePolicy>;
  chordOctavePolicies: Record<string, OctavePolicy>;

  addLetterTemplate: (name: string, letters: string[]) => string;
  addFrequencyTemplate: (name: string, freqsHz: number[]) => string;
  renameTemplate: (id: string, name: string) => void;
  removeTemplate: (id: string) => void;

  setConfig: (partial: Partial<RNGConfig>) => void;
  setSelectedIndices: (indices: number[]) => void;
  setTemplate: (templateId: string | null) => void;

  resolveItems: (a4?: number) => void;
  buildCombos: () => void;
  buildCombosBase: () => void;

  addChord: (name: string, members: RNGChordMember[]) => string;
  updateChord: (id: string, patch: Partial<Omit<RNGChord, 'id'>>) => void;
  removeChord: (id: string) => void;

  setModelFilter: (selectedModelIds: string[]) => void;

  setDefaultContour?: (curve?: ContourCurve) => void;
  setSingleContour: (itemId: string, curve?: ContourCurve) => void;
  setChordGroupContour: (chordId: string, curve?: ContourCurve) => void;
  setChordNoteContour: (chordId: string, memberKey: string, curve?: ContourCurve) => void;
  setComboGroupContour: (comboBaseId: string, curve?: ContourCurve) => void;
  setComboNoteContour: (comboBaseId: string, noteIndex: number, curve?: ContourCurve) => void;

  setComboOctavePolicy: (comboBaseId: string, policy: OctavePolicy) => void;
  setChordOctavePolicy: (chordId: string, policy: OctavePolicy) => void;

  resolveComboVoicing: (comboBaseId: string, seed?: number) => number[];
  resolveChordVoicing: (chordId: string, seed?: number) => number[];
}

/* ===== Utils ===== */
function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useRngStore = create<RNGState>()(persist(
  (set, get) => ({
    templates: defaultTemplates,
    config: defaultConfig(),

    items: [],
    combos: [],
    combosBase: [],
    chords: [],

    comboOctavePolicies: {},
    chordOctavePolicies: {},

    addLetterTemplate: (name, letters) => {
      const id = genId('tpl-letter');
      set((s) => ({
        templates: {
          ...s.templates,
          [id]: { id, name: name.trim() || 'Letter Template', type: 'letter', letters: letters.map(canonicalPc) },
        },
      }));
      return id;
    },
    addFrequencyTemplate: (name, freqsHz) => {
      const id = genId('tpl-freq');
      set((s) => ({
        templates: {
          ...s.templates,
          [id]: { id, name: name.trim() || 'Frequency Template', type: 'frequency', freqsHz: [...freqsHz] },
        },
      }));
      return id;
    },
    renameTemplate: (id, name) => set((s) => {
      const t = s.templates[id]; if (!t) return {};
      if (t.builtIn) return {};
      return { templates: { ...s.templates, [id]: { ...t, name: name.trim() || t.name } } };
    }),
    removeTemplate: (id) => set((s) => {
      const t = s.templates[id]; if (!t) return {};
      if (t.builtIn) return {};
      const { [id]: _, ...rest } = s.templates;
      const nextTpl = s.config.templateId === id ? 'tpl-western-letter' : s.config.templateId;
      return {
        templates: rest,
        config: { ...s.config, templateId: nextTpl, selectedIndices: [] },
        items: [], combos: [], combosBase: [],
      };
    }),

    setConfig: (partial) => set((s) => ({ config: { ...s.config, ...partial } })),
    setSelectedIndices: (indices) => set((s) => ({ config: { ...s.config, selectedIndices: indices } })),
    setTemplate: (templateId) => set((s) => ({
      config: { ...s.config, templateId, selectedIndices: [] },
      items: [], combos: [], combosBase: [],
    })),

    resolveItems: (a4 = 440) => set((s) => {
      const cfg = s.config;
      const tpl = cfg.templateId ? s.templates[cfg.templateId] : undefined;
      if (!tpl) return {};
      const octaves = cfg.octave.sameForSingleAndChord
        ? cfg.octave.singleOctaves
        : (cfg.polyphony.enabled ? cfg.octave.chordOctaves : cfg.octave.singleOctaves);
      const items: RNGItem[] = [];

      if (tpl.type === 'letter' && tpl.letters) {
        for (const idx of cfg.selectedIndices) {
          const pc = tpl.letters[idx];
          if (!pc) continue;
          for (const oct of octaves) {
            if (oct < 1 || oct > 10) continue;
            const hz = noteToHz(pc, oct, a4);
            items.push({ id: `pc-${idx}-o${oct}`, label: `${pc}${oct}`, freqHz: hz });
          }
        }
      } else if (tpl.type === 'frequency' && tpl.freqsHz) {
        for (const idx of cfg.selectedIndices) {
          const hz = tpl.freqsHz[idx];
          if (typeof hz !== 'number') continue;
          items.push({ id: `f-${hz.toFixed(5)}`, label: `${hz.toFixed(2)} Hz`, freqHz: hz });
        }
      }
      return { items };
    }),

    buildCombos: () => set((s) => {
      if (!s.config.polyphony.enabled) return { combos: [] };
      const n = s.items.length;
      const k = s.config.polyphony.k;
      if (k < 1 || k > n) return { combos: [] };
      const lex = combinationsLex(n, k);
      const combos: RNGCombination[] = lex.map((ix) => {
        const ids = ix.map((i) => s.items[i].id);
        const labels = ix.map((i) => s.items[i].label).join(' + ');
        return { id: ids.join('__'), itemIds: ids, labels };
      });
      return { combos };
    }),

    buildCombosBase: () => set((s) => {
      if (!s.config.polyphony.enabled) return { combosBase: [] };
      const cfg = s.config;
      const tpl = cfg.templateId ? s.templates[cfg.templateId] : undefined;
      if (!tpl) return { combosBase: [] };

      const baseLabels: string[] = [];
      const baseTokens: string[] = []; // "pi-<idx>" or "pf-<idx>"
      for (const idx of cfg.selectedIndices) {
        if (tpl.type === 'letter' && tpl.letters) {
          baseLabels.push(tpl.letters[idx]!);
          baseTokens.push(`pi-${idx}`);
        } else if (tpl.type === 'frequency' && tpl.freqsHz) {
          const hz = tpl.freqsHz[idx]!;
          baseLabels.push(`${hz.toFixed(2)} Hz`);
          baseTokens.push(`pf-${idx}`);
        }
      }

      const n = baseLabels.length;
      const k = cfg.polyphony.k;
      if (k < 1 || k > n) return { combosBase: [] };

      const lex = combinationsLex(n, k);
      const combosBase: RNGCombination[] = lex.map((ix) => {
        const ids = ix.map(i => baseTokens[i]);
        const labels = ix.map(i => baseLabels[i]).join(' + ');
        return { id: `base-${ids.join('__')}`, itemIds: ids, labels };
      });
      return { combosBase };
    }),

    addChord: (name, members) => {
      const id = genId('chord');
      set((s) => ({ chords: [...s.chords, { id, name: name.trim() || 'Chord', members: members.slice() }] }));
      return id;
    },
    updateChord: (id, patch) => set((s) => ({
      chords: s.chords.map((c) => (c.id === id ? { ...c, ...patch, members: patch.members ?? c.members } : c)),
    })),
    removeChord: (id) => set((s) => ({
      chords: s.chords.filter((c) => c.id !== id),
      chordOctavePolicies: Object.fromEntries(Object.entries(s.chordOctavePolicies).filter(([k]) => k !== id)),
    })),

    setModelFilter: (selectedModelIds) => set((s) => ({
      config: { ...s.config, modelFilter: { selectedModelIds: [...selectedModelIds] } }
    })),

    setDefaultContour: undefined,
    setSingleContour: (itemId, curve) => set((s) => {
      const next = { ...s.config.contourOverrides.single };
      if (!curve) delete next[itemId]; else next[itemId] = curve;
      return { config: { ...s.config, contourOverrides: { ...s.config.contourOverrides, single: next } } };
    }),

    setChordGroupContour: (chordId, curve) => set((s) => {
      const next = { ...s.config.contourOverrides.chordGroup };
      if (!curve) delete next[chordId]; else next[chordId] = curve;
      return { config: { ...s.config, contourOverrides: { ...s.config.contourOverrides, chordGroup: next } } };
    }),
    setChordNoteContour: (chordId, memberKey, curve) => set((s) => {
      const key = `${chordId}::${memberKey}`;
      const next = { ...s.config.contourOverrides.chordPerNote };
      if (!curve) delete next[key]; else next[key] = curve;
      return { config: { ...s.config, contourOverrides: { ...s.config.contourOverrides, chordPerNote: next } } };
    }),

    setComboGroupContour: (comboBaseId, curve) => set((s) => {
      const cg = { ...(s.config.contourOverrides.comboGroup ?? {}) };
      if (!curve) delete cg[comboBaseId]; else cg[comboBaseId] = curve;
      return { config: { ...s.config, contourOverrides: { ...s.config.contourOverrides, comboGroup: cg } } };
    }),
    setComboNoteContour: (comboBaseId, noteIndex, curve) => set((s) => {
      const key = `${comboBaseId}::${noteIndex}`;
      const cp = { ...(s.config.contourOverrides.comboPerNote ?? {}) };
      if (!curve) delete cp[key]; else cp[key] = curve;
      return { config: { ...s.config, contourOverrides: { ...s.config.contourOverrides, comboPerNote: cp } } };
    }),

    setComboOctavePolicy: (comboBaseId, policy) => set((s) => ({
      comboOctavePolicies: { ...s.comboOctavePolicies, [comboBaseId]: policy },
    })),
    setChordOctavePolicy: (chordId, policy) => set((s) => ({
      chordOctavePolicies: { ...s.chordOctavePolicies, [chordId]: policy },
    })),

    resolveComboVoicing: (comboBaseId, _seed) => {
      const s = get();
      const cfg = s.config;
      const tpl = cfg.templateId ? s.templates[cfg.templateId] : undefined;
      if (!tpl) return [];

      const combo = s.combosBase.find((c) => c.id === comboBaseId);
      if (!combo) return [];

      const policy = s.comboOctavePolicies[comboBaseId] ?? { mode: 'global' as const };
      const globalAllowed = (cfg.octave.chordOctaves?.length ? [...cfg.octave.chordOctaves] : [4]).sort((a,b)=>a-b);

      const firstAllowed = (arr?: number[]) => (arr && arr.length ? arr[0] : globalAllowed[0] ?? 4);
      const clampOct = (o: number) => Math.max(1, Math.min(10, Math.trunc(o)));

      const freqs: number[] = [];

      if (tpl.type === 'letter') {
        const pcs: string[] = combo.itemIds.map((tok) => {
          const m = tok.match(/^pi-(\d+)$/);
          return m ? (tpl.letters?.[Number(m[1])] ?? '') : '';
        }).filter(Boolean);

        const chosenOcts: number[] = [];
        if (policy.mode === 'global' || !policy.mode) {
          const o = firstAllowed(globalAllowed);
          for (let i=0;i<pcs.length;i++) chosenOcts.push(o);
        } else if (policy.mode === 'uniform') {
          const o = firstAllowed(policy.octaves);
          for (let i=0;i<pcs.length;i++) chosenOcts.push(o);
        } else if (policy.mode === 'independent') {
          for (let i=1;i<=pcs.length;i++) {
            const allowed = (policy.allowed?.[i]?.length ? policy.allowed[i] : globalAllowed)!;
            chosenOcts.push(firstAllowed(allowed));
          }
        } else if (policy.mode === 'relative') {
          const rootOct = firstAllowed(policy.rootOctaves?.length ? policy.rootOctaves : globalAllowed);
          const offs = policy.offsets ?? [];
          for (let i=0;i<pcs.length;i++) chosenOcts.push(clampOct(rootOct + (offs[i] ?? 0)));
        }

        for (let i=0;i<pcs.length;i++) {
          const pc = pcs[i];
          const o = chosenOcts[i] ?? firstAllowed(globalAllowed);
          freqs.push(noteToHz(pc, o, 440));
        }
        return freqs.filter((f)=>Number.isFinite(f) && f>0);
      }

      // frequency template
      const out: number[] = [];
      combo.itemIds.forEach((tok) => {
        const m = tok.match(/^pf-(\d+)$/);
        if (m) {
          const idx = Number(m[1]);
          const hz = tpl.freqsHz?.[idx];
          if (typeof hz === 'number') out.push(hz);
        }
      });
      return out.filter((f)=>Number.isFinite(f) && f>0);
    },

    resolveChordVoicing: (chordId, _seed) => {
      const s = get();
      const cfg = s.config;
      const tpl = cfg.templateId ? s.templates[cfg.templateId] : undefined;
      if (!tpl) return [];

      const chord = s.chords.find((ch) => ch.id === chordId);
      if (!chord) return [];

      const policy = s.chordOctavePolicies[chordId] ?? { mode: 'global' as const };
      const globalAllowed = (cfg.octave.chordOctaves?.length ? [...cfg.octave.chordOctaves] : [4]).sort((a,b)=>a-b);

      const firstAllowed = (arr?: number[]) => (arr && arr.length ? arr[0] : globalAllowed[0] ?? 4);
      const clampOct = (o: number) => Math.max(1, Math.min(10, Math.trunc(o)));

      const byId = new Map(s.items.map(i => [i.id, i] as const));

      type MemberRes = { type: 'pc', pc: string, index: number } | { type: 'fixed', hz: number };
      const members: MemberRes[] = chord.members.map((m, i) => {
        if (typeof m.freqHz === 'number' && m.freqHz > 0) return { type: 'fixed', hz: m.freqHz };
        if (m.itemRefId) {
          if (m.itemRefId.startsWith('pc-') && tpl?.type === 'letter') {
            const mm = m.itemRefId.match(/^pc-(\d+)-o(\d+)$/);
            if (mm) {
              const idx = Number(mm[1]);
              const pc = tpl.letters?.[idx];
              if (pc) return { type: 'pc', pc, index: i+1 };
            }
          } else if (m.itemRefId.startsWith('f-')) {
            const it = byId.get(m.itemRefId);
            const hz = it?.freqHz;
            if (typeof hz === 'number') return { type: 'fixed', hz };
            const parsed = Number(m.itemRefId.slice(2));
            if (Number.isFinite(parsed)) return { type: 'fixed', hz: parsed };
          }
        }
        return { type: 'fixed', hz: 0 };
      });

      const out: number[] = [];

      const chooseUniform = () => {
        const o = firstAllowed(policy.mode === 'uniform' ? policy.octaves : globalAllowed);
        for (const m of members) {
          if (m.type === 'pc') out.push(noteToHz(m.pc, o, 440));
          else if (m.type === 'fixed' && m.hz > 0) out.push(m.hz);
        }
      };

      const chooseIndependent = () => {
        for (let i=0;i<members.length;i++) {
          const m = members[i];
          if (m.type === 'pc') {
            const pos = i+1;
            const allowed = (policy.mode === 'independent' ? policy.allowed?.[pos] : undefined) ?? globalAllowed;
            const o = firstAllowed(allowed);
            out.push(noteToHz(m.pc, o, 440));
          } else if (m.type === 'fixed' && m.hz > 0) out.push(m.hz);
        }
      };

      const chooseRelative = () => {
        const hasLetterAt = (pos: number) => members[pos-1]?.type === 'pc';
        const requested = (policy.mode === 'relative' ? policy.rootIndex : 1) ?? 1;
        const firstLetterPos = members.findIndex(m => m.type === 'pc') + 1 || 1;
        const rootOct = firstAllowed(policy.mode === 'relative' ? (policy.rootOctaves?.length ? policy.rootOctaves : globalAllowed) : globalAllowed);
        const offs = (policy.mode === 'relative' ? policy.offsets : []) ?? [];

        for (let i=0;i<members.length;i++) {
          const m = members[i];
          if (m.type === 'pc') {
            const o = clampOct(rootOct + (offs[i] ?? 0));
            out.push(noteToHz(m.pc, o, 440));
          } else if (m.type === 'fixed' && m.hz > 0) out.push(m.hz);
        }
      };

      if (tpl.type === 'letter') {
        if (policy.mode === 'global' || !policy.mode) chooseUniform();
        else if (policy.mode === 'uniform') chooseUniform();
        else if (policy.mode === 'independent') chooseIndependent();
        else if (policy.mode === 'relative') chooseRelative();
      } else {
        for (const m of members) if (m.type === 'fixed' && m.hz > 0) out.push(m.hz);
      }

      return out.filter((f)=>Number.isFinite(f) && f>0);
    },
  }),
  { name: 'rng-store-v3' }
));