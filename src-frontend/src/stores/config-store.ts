import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppConfig } from "../types/common";

type ConfigStore = {
  current: AppConfig;
  setPartial: (partialConfig: Partial<AppConfig>) => void;
  restoreDefault: () => void;
};

const DEFAULT_CONFIG: AppConfig = {
  theme: "system",
  language: "en",
};

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      current: DEFAULT_CONFIG,
      setPartial(partialConfig) {
        const current = get().current;
        set({ current: { ...current, ...partialConfig } });
      },
      restoreDefault() {
        set({ current: DEFAULT_CONFIG });
      },
    }),
    { name: "app-config" }
  )
);
