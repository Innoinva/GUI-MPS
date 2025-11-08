import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';
type Density = 'comfortable' | 'compact';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface GlobalSettings {
  theme: Theme;
  density: Density;
  autoSave: boolean;
  confirmExit: boolean;
  dataDir: string;
}

interface StudioSettings {
  sampleRate: 44100 | 48000;
  bufferSize: 128 | 256 | 512;
  midiEnabled: boolean;
  uiDensity: Density;
  defaultProject: string;
  previewVolume: number; // 0-100
}

interface TrainingSettings {
  defaultProfile: string;
  difficulty: Difficulty;
  soundPreview: boolean;
  showTips: boolean;
}

interface SettingsState {
  global: GlobalSettings;
  studio: StudioSettings;
  training: TrainingSettings;

  // updaters
  updateGlobal: (partial: Partial<GlobalSettings>) => void;
  updateStudio: (partial: Partial<StudioSettings>) => void;
  updateTraining: (partial: Partial<TrainingSettings>) => void;

  // resets
  resetGlobal: () => void;
  resetStudio: () => void;
  resetTraining: () => void;
}

const defaultGlobal: GlobalSettings = {
  theme: 'dark',
  density: 'comfortable',
  autoSave: true,
  confirmExit: true,
  dataDir: 'C:\\Users\\user\\Documents\\AuditoryTraining',
};

const defaultStudio: StudioSettings = {
  sampleRate: 48000,
  bufferSize: 256,
  midiEnabled: true,
  uiDensity: 'comfortable',
  defaultProject: 'Untitled',
  previewVolume: 75,
};

const defaultTraining: TrainingSettings = {
  defaultProfile: 'Learner',
  difficulty: 'beginner',
  soundPreview: true,
  showTips: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      global: defaultGlobal,
      studio: defaultStudio,
      training: defaultTraining,

      updateGlobal: (partial) =>
        set((s) => ({ global: { ...s.global, ...partial } })),
      updateStudio: (partial) =>
        set((s) => ({ studio: { ...s.studio, ...partial } })),
      updateTraining: (partial) =>
        set((s) => ({ training: { ...s.training, ...partial } })),

      resetGlobal: () => set(() => ({ global: defaultGlobal })),
      resetStudio: () => set(() => ({ studio: defaultStudio })),
      resetTraining: () => set(() => ({ training: defaultTraining })),
    }),
    {
      name: 'settings-store-v1', // key in localStorage
      version: 1,
    }
  )
);