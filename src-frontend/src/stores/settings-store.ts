import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "../types/common";

type SettingsStore = {
  current: AppSettings;
  setPartial: (partialConfig: Partial<AppSettings>) => void;
  restoreDefault: () => void;
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  language: "en",
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      current: DEFAULT_SETTINGS,
      setPartial(partialConfig) {
        const current = get().current;
        set({ current: { ...current, ...partialConfig } });
      },
      restoreDefault() {
        set({ current: DEFAULT_SETTINGS });
      },
    }),
    { name: "app-settings" }
  )
);
