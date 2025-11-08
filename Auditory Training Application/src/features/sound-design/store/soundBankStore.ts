import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SmsModel } from '@/features/sound-design/types/sms';
import { generateId } from '@/shared/utils/id';

interface SoundBankState {
  models: SmsModel[];
  add: (model: Omit<SmsModel, 'meta'> & Partial<Pick<SmsModel, 'meta'>>) => SmsModel;
  update: (model: SmsModel) => void;
  remove: (id: string) => void;
  getById: (id: string) => SmsModel | undefined;
}

export const useSoundBankStore = create<SoundBankState>()(
  persist(
    (set, get) => ({
      models: [],
      add: (modelInput) => {
        const now = Date.now();
        const id = modelInput.meta?.id ?? generateId('sms');
        const model: SmsModel = {
          ...modelInput,
          meta: {
            id,
            createdAt: modelInput.meta?.createdAt ?? now,
            updatedAt: now,
            tags: modelInput.meta?.tags ?? [],
            source: modelInput.meta?.source,
          },
        } as SmsModel;

        set((s) => ({ models: [...s.models, model] }));
        return model;
      },
      update: (model) => {
        set((s) => ({
          models: s.models.map((m) => (m.meta.id === model.meta.id ? { ...model, meta: { ...model.meta, updatedAt: Date.now() } } : m)),
        }));
      },
      remove: (id) => {
        set((s) => ({ models: s.models.filter((m) => m.meta.id !== id) }));
      },
      getById: (id) => {
        return get().models.find((m) => m.meta.id === id);
      },
    }),
    { name: 'sound-bank-v1' }
  )
);