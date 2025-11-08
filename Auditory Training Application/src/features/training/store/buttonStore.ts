import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ButtonDefinition } from '../types/buttons.types';
import { useRngStore } from './rngStore';
import type { ModelAssignmentSpec } from '../types/rng.types';

type GenerateMode = 'replace' | 'append';

interface ButtonState {
  linked: boolean;                         // if true, follow RNG changes
  generateMode: GenerateMode;              // replace or append on generation
  buttons: ButtonDefinition[];

  setGenerateMode: (mode: GenerateMode) => void;

  // Generation
  generateFromRngSingles: () => void;
  generateFromRngCombos: () => void;                      // all combosBase
  generateFromRngCombosUsing: (comboBaseIds: string[]) => void; // expects base IDs ("base-...")
  generateFromRngChords: () => void;
  generateFromRngChordsUsing: (chordIds: string[]) => void;

  // Layout/tools
  optimizeLayout: (opts?: { startX?: number; startY?: number; gap?: number; maxCols?: number }) => void;

  // Link/snapshot
  snapshotFromRng: () => void;
  setLinked: (on: boolean) => void;

  // Editing
  updateButton: (id: string, partial: Partial<ButtonDefinition>) => void;
  removeButton: (id: string) => void;
  clear: () => void;

  // Exchange
  exportJson: () => string;
  importJson: (json: string, mode?: GenerateMode) => void;
}

// Helper: model assignment per voice
function assignModelsForVoices(
  buttonIdx: number,
  voicesLen: number,
  policy: ModelAssignmentSpec,
  selectedModelIds: string[],
): string[] {
  const models = selectedModelIds.length ? selectedModelIds : (policy.defaultModelId ? [policy.defaultModelId] : []);
  const out: string[] = Array(voicesLen).fill('');

  if (policy.policy === 'same') {
    const chosen = models[0] ?? '';
    return out.map(() => chosen);
  }
  if (policy.policy === 'byIndex') {
    for (let i = 0; i < voicesLen; i++) {
      const mapped = policy.byIndex?.[i] ?? '';
      out[i] = mapped || (models.length ? models[i % models.length] : (policy.defaultModelId ?? '')) || '';
    }
    return out;
  }
  // roundRobin
  for (let i = 0; i < voicesLen; i++) {
    const pick = models.length ? models[(buttonIdx + i) % models.length] : (policy.defaultModelId ?? '');
    out[i] = pick || '';
  }
  return out;
}

function mergeByMode(curr: ButtonDefinition[], fresh: ButtonDefinition[], mode: GenerateMode): ButtonDefinition[] {
  return mode === 'append' ? [...curr, ...fresh] : fresh;
}

export const useButtonStore = create<ButtonState>()(persist(
  (set, get) => ({
    linked: true,
    generateMode: 'replace',
    buttons: [],

    setGenerateMode: (mode) => set({ generateMode: mode }),

    generateFromRngSingles: () => {
      const rng = useRngStore.getState();
      const { items, config } = rng;
      const modelsSel = config.modelFilter.selectedModelIds;
      const policy = config.modelAssignment ?? { policy: 'roundRobin', defaultModelId: null };

      const fresh: ButtonDefinition[] = items.map((it, idx) => {
        const modelIds = assignModelsForVoices(idx, 1, policy, modelsSel);
        return {
          id: `b-${it.id}`,
          label: it.label,
          freqHz: [it.freqHz],
          linkedFromRng: true,
          rngRef: { type: 'single', id: it.id },
          voices: modelIds.map((m) => ({ modelId: m || null })),
          appearance: { sizePx: 96, shape: 'circle', color: '#6B21A8' },
          behavior: { trigger: 'momentary', reactiveColor: { mode: 'off', durationMs: 500 }, lightFeedback: { mode: 'off', durationMs: 1000 } },
          layout: { x: 40, y: 40 },
        };
      });
      const merged = mergeByMode(get().buttons, fresh, get().generateMode);
      set({ buttons: merged, linked: true });
    },

    generateFromRngCombos: () => {
      const rng = useRngStore.getState();
      const { combosBase, resolveComboVoicing, config } = rng;
      const modelsSel = config.modelFilter.selectedModelIds;
      const policy = config.modelAssignment ?? { policy: 'roundRobin', defaultModelId: null };

      const fresh: ButtonDefinition[] = combosBase.map((c, idx) => {
        const freqs = resolveComboVoicing(c.id);
        const modelIds = assignModelsForVoices(idx, freqs.length, policy, modelsSel);
        return {
          id: `b-${c.id}`,
          label: c.labels,
          freqHz: freqs,
          linkedFromRng: true,
          rngRef: { type: 'combo', id: c.id }, // base id ("base-...")
          voices: modelIds.map((m) => ({ modelId: m || null })),
          appearance: { sizePx: 96, shape: 'circle', color: '#6B21A8' },
          behavior: { trigger: 'momentary', reactiveColor: { mode: 'off', durationMs: 500 }, lightFeedback: { mode: 'off', durationMs: 1000 } },
          layout: { x: 40, y: 40 },
        };
      });
      const merged = mergeByMode(get().buttons, fresh, get().generateMode);
      set({ buttons: merged, linked: true });
    },

    generateFromRngCombosUsing: (comboBaseIds) => {
      const rng = useRngStore.getState();
      const { combosBase, resolveComboVoicing, config } = rng;
      const modelsSel = config.modelFilter.selectedModelIds;
      const policy = config.modelAssignment ?? { policy: 'roundRobin', defaultModelId: null };

      const wanted = new Set(comboBaseIds);
      const filtered = combosBase.filter(c => wanted.has(c.id));
      const fresh: ButtonDefinition[] = filtered.map((c, idx) => {
        const freqs = resolveComboVoicing(c.id);
        const modelIds = assignModelsForVoices(idx, freqs.length, policy, modelsSel);
        return {
          id: `b-${c.id}`,
          label: c.labels,
          freqHz: freqs,
          linkedFromRng: true,
          rngRef: { type: 'combo', id: c.id }, // base id
          voices: modelIds.map((m) => ({ modelId: m || null })),
          appearance: { sizePx: 96, shape: 'circle', color: '#6B21A8' },
          behavior: { trigger: 'momentary', reactiveColor: { mode: 'off', durationMs: 500 }, lightFeedback: { mode: 'off', durationMs: 1000 } },
          layout: { x: 40, y: 40 },
        };
      });
      const merged = mergeByMode(get().buttons, fresh, get().generateMode);
      set({ buttons: merged, linked: true });
    },

    generateFromRngChords: () => {
      const rng = useRngStore.getState();
      const { chords, resolveChordVoicing, config } = rng;
      const modelsSel = config.modelFilter.selectedModelIds;
      const policy = config.modelAssignment ?? { policy: 'roundRobin', defaultModelId: null };

      const fresh: ButtonDefinition[] = chords.map((ch, idx) => {
        const freqs = resolveChordVoicing(ch.id);
        const modelIds = assignModelsForVoices(idx, freqs.length, policy, modelsSel);
        return {
          id: `b-ch-${ch.id}`,
          label: ch.name,
          freqHz: freqs,
          linkedFromRng: true,
          rngRef: { type: 'chord', id: ch.id },
          voices: modelIds.map((m) => ({ modelId: m || null })),
          appearance: { sizePx: 96, shape: 'circle', color: '#6B21A8' },
          behavior: { trigger: 'momentary', reactiveColor: { mode: 'off', durationMs: 500 }, lightFeedback: { mode: 'off', durationMs: 1000 } },
          layout: { x: 40, y: 40 },
        };
      });
      const merged = mergeByMode(get().buttons, fresh, get().generateMode);
      set({ buttons: merged, linked: true });
    },

    generateFromRngChordsUsing: (chordIds) => {
      const rng = useRngStore.getState();
      const { chords, resolveChordVoicing, config } = rng;
      const modelsSel = config.modelFilter.selectedModelIds;
      const policy = config.modelAssignment ?? { policy: 'roundRobin', defaultModelId: null };

      const wanted = new Set(chordIds);
      const filtered = chords.filter(ch => wanted.has(ch.id));
      const fresh: ButtonDefinition[] = filtered.map((ch, idx) => {
        const freqs = resolveChordVoicing(ch.id);
        const modelIds = assignModelsForVoices(idx, freqs.length, policy, modelsSel);
        return {
          id: `b-ch-${ch.id}`,
          label: ch.name,
          freqHz: freqs,
          linkedFromRng: true,
          rngRef: { type: 'chord', id: ch.id },
          voices: modelIds.map((m) => ({ modelId: m || null })),
          appearance: { sizePx: 96, shape: 'circle', color: '#6B21A8' },
          behavior: { trigger: 'momentary', reactiveColor: { mode: 'off', durationMs: 500 }, lightFeedback: { mode: 'off', durationMs: 1000 } },
          layout: { x: 40, y: 40 },
        };
      });
      const merged = mergeByMode(get().buttons, fresh, get().generateMode);
      set({ buttons: merged, linked: true });
    },

    optimizeLayout: (opts) => {
      const buttons = get().buttons.slice();
      const startX = opts?.startX ?? 40;
      const startY = opts?.startY ?? 40;
      const gap = opts?.gap ?? 16;
      const maxCols = Math.max(1, opts?.maxCols ?? 6);

      let col = 0;
      let row = 0;

      const next = buttons.map((b) => {
        const size = Math.max(24, Math.min(384, b.appearance?.sizePx ?? 96));
        const x = startX + col * (size + gap);
        const y = startY + row * (size + gap);
        col++;
        if (col >= maxCols) { col = 0; row++; }
        return { ...b, layout: { ...(b.layout ?? {}), x, y } };
      });
      set({ buttons: next });
    },

    snapshotFromRng: () => {
      const prev = get().buttons;
      set({ buttons: prev.map(b => ({ ...b, linkedFromRng: false })), linked: false });
    },

    setLinked: (on) => set({ linked: on, buttons: get().buttons.map(b => ({ ...b, linkedFromRng: on })) }),

    updateButton: (id, partial) =>
      set((s) => ({ buttons: s.buttons.map(b => (b.id === id ? { ...b, ...partial } : b)) })),

    removeButton: (id) =>
      set((s) => ({ buttons: s.buttons.filter(b => b.id !== id) })),

    clear: () => set({ buttons: [] }),

    exportJson: () => {
      const data = { version: 1, exportedAt: new Date().toISOString(), buttons: get().buttons };
      return JSON.stringify(data, null, 2);
    },

    importJson: (json, mode = 'append') => {
      try {
        const parsed = JSON.parse(json);
        const arr: ButtonDefinition[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.buttons) ? parsed.buttons : [];
        if (!Array.isArray(arr)) return;

        // De-dup IDs; generate new ones if conflicts
        const existing = new Set(get().buttons.map(b => b.id));
        const sanitized = arr.map((b, i) => ({
          ...b,
          id: existing.has(b.id) ? `b-import-${Date.now()}-${i}` : b.id,
        }));

        const merged = mode === 'append' ? [...get().buttons, ...sanitized] : sanitized;
        set({ buttons: merged });
      } catch (e) {
        console.error('[buttonStore.importJson] failed:', e);
      }
    },
  }),
  { name: 'button-store-v3' }
));

// Link-mode auto-refresh: when RNG changes, update linked buttons’ freqHz
useRngStore.subscribe(
  // minimal selector: hash relevant slices
  (s) => ({
    tpl: s.config.templateId,
    oct: s.config.octave,
    poly: s.config.polyphony,
    itemsKey: s.items.map(i => i.id).join('|'),
    chordsKey: s.chords.map(c => c.id).join('|'),
    combosBaseKey: s.combosBase.map(c => c.id).join('|'),
  }),
  () => {
    const { buttons, linked } = useButtonStore.getState();
    if (!linked || buttons.length === 0) return;

    const rng = useRngStore.getState();
    const next = buttons.map((b) => {
      if (!b.linkedFromRng || !b.rngRef) return b;

      if (b.rngRef.type === 'combo') {
        const freqs = rng.resolveComboVoicing(b.rngRef.id);
        if (!Array.isArray(freqs) || freqs.length === 0) return b;
        // preserve voices count mapping as much as possible
        const voices = freqs.map((_, i) => b.voices?.[i] ?? { modelId: null });
        return { ...b, freqHz: freqs, voices };
      }
      if (b.rngRef.type === 'chord') {
        const freqs = rng.resolveChordVoicing(b.rngRef.id);
        if (!Array.isArray(freqs) || freqs.length === 0) return b;
        const voices = freqs.map((_, i) => b.voices?.[i] ?? { modelId: null });
        return { ...b, freqHz: freqs, voices };
      }
      if (b.rngRef.type === 'single') {
        const it = rng.items.find(x => x.id === b.rngRef!.id);
        if (!it) return b;
        const voices = [b.voices?.[0] ?? { modelId: null }];
        return { ...b, freqHz: [it.freqHz], voices };
      }
      return b;
    });

    useButtonStore.setState({ buttons: next });
  }
);