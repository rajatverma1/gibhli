import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LCApplication } from '../types/lc';
import { api } from '../api/client';

interface LCStore {
  currentLC: LCApplication | null;
  isSaving: boolean;
  lastSaved: string | null;
  error: string | null;

  createNewLC: () => Promise<string>;
  loadLC: (id: string) => Promise<void>;
  saveStep1: (data: NonNullable<LCApplication['step1']>) => Promise<void>;
  saveStep2: (data: NonNullable<LCApplication['step2']>) => Promise<void>;
  saveStep3: (data: NonNullable<LCApplication['step3']>) => Promise<void>;
  runMismatch: () => Promise<void>;
  resolveMismatch: (index: number, resolution: NonNullable<LCApplication['step4']>['mismatches'][0]['resolution']) => Promise<void>;
  submitLC: () => Promise<void>;
  clearError: () => void;
}

export const useLCStore = create<LCStore>()(
  persist(
    (set, get) => ({
      currentLC: null,
      isSaving: false,
      lastSaved: null,
      error: null,

      createNewLC: async () => {
        const { data } = await api.createLC();
        set({ currentLC: data, lastSaved: new Date().toISOString() });
        return data.id;
      },

      loadLC: async (id: string) => {
        const { data } = await api.getLC(id);
        set({ currentLC: data });
      },

      saveStep1: async (data) => {
        const { currentLC } = get();
        if (!currentLC) throw new Error('No active LC');
        set({ isSaving: true });
        try {
          const res = await api.saveStep(currentLC.id, 1, data);
          set({ currentLC: res.data, isSaving: false, lastSaved: new Date().toISOString() });
        } catch (e) {
          set({ isSaving: false, error: (e as Error).message });
          throw e;
        }
      },

      saveStep2: async (data) => {
        const { currentLC } = get();
        if (!currentLC) throw new Error('No active LC');
        set({ isSaving: true });
        try {
          const res = await api.saveStep(currentLC.id, 2, data);
          set({ currentLC: res.data, isSaving: false, lastSaved: new Date().toISOString() });
        } catch (e) {
          set({ isSaving: false, error: (e as Error).message });
          throw e;
        }
      },

      saveStep3: async (data) => {
        const { currentLC } = get();
        if (!currentLC) throw new Error('No active LC');
        set({ isSaving: true });
        try {
          const res = await api.saveStep(currentLC.id, 3, data);
          set({ currentLC: res.data, isSaving: false, lastSaved: new Date().toISOString() });
        } catch (e) {
          set({ isSaving: false, error: (e as Error).message });
          throw e;
        }
      },

      runMismatch: async () => {
        const { currentLC } = get();
        if (!currentLC) throw new Error('No active LC');
        set({ isSaving: true });
        try {
          const res = await api.runMismatch(currentLC.id);
          set(state => ({
            currentLC: state.currentLC
              ? { ...state.currentLC, step4: res.data, currentStep: Math.max(state.currentLC.currentStep, 4) }
              : null,
            isSaving: false,
          }));
        } catch (e) {
          set({ isSaving: false, error: (e as Error).message });
          throw e;
        }
      },

      resolveMismatch: async (index, resolution) => {
        const { currentLC } = get();
        if (!currentLC) throw new Error('No active LC');
        const res = await api.resolveMismatch(currentLC.id, index, resolution!);
        set(state => ({
          currentLC: state.currentLC ? { ...state.currentLC, step4: res.data } : null,
        }));
      },

      submitLC: async () => {
        const { currentLC } = get();
        if (!currentLC) throw new Error('No active LC');
        set({ isSaving: true });
        try {
          const res = await api.submitLC(currentLC.id);
          set({ currentLC: res.data, isSaving: false, lastSaved: new Date().toISOString() });
        } catch (e) {
          set({ isSaving: false, error: (e as Error).message });
          throw e;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'citrade-lc-store',
      partialize: (state) => ({ currentLC: state.currentLC, lastSaved: state.lastSaved }),
    }
  )
);
