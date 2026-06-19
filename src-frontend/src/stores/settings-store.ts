import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "../types/common";
import { produce } from "immer";

type SettingsStore = {
  current: AppSettings;
  setPartial: (partialConfig: Partial<AppSettings>) => void;
  restoreDefault: () => void;
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  language: "en",
  shortcuts: {
    toggle_sidebar: ["ctrl", "b"],
    close_tab: ["ctrl", "w"],
    new_task: ["ctrl", "n"],
  },
};

function merge(
  persistedState: Partial<SettingsStore>,
  currentState: SettingsStore,
) {
  return {
    ...currentState,
    ...persistedState,
    current: {
      ...currentState.current,
      ...persistedState.current,
      shortcuts: {
        ...currentState.current.shortcuts,
        ...persistedState.current?.shortcuts,
      },
    },
  };
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, _get) => ({
      current: DEFAULT_SETTINGS,
      setPartial(partialConfig) {
        set(
          produce((state) => {
            Object.assign(state.current, partialConfig);
          }),
        );
      },
      restoreDefault() {
        set({ current: DEFAULT_SETTINGS });
      },
    }),
    {
      name: "app-settings",
      merge: (persistedState: any, currentState: SettingsStore) =>
        merge(persistedState, currentState),
    },
  ),
);
