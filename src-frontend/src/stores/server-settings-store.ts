import { create } from "zustand";
import type { AppSettings } from "@/api/generated/schemas";
import { getSettings, updateSettings } from "@/api/settings";

type ServerSettingsStore = {
  current: AppSettings | null;
  currentPromise: Promise<AppSettings> | null;
  setPartial: (settings: Partial<AppSettings>) => void;
};

export const useServerSettingsStore = create<ServerSettingsStore>()((set, get) => ({
  current: null,
  currentPromise: getSettings().then((settings) => {
    set({ current: settings });
    return settings;
  }),
  setPartial(partialSettings) {
    const current = get().current;
    if (!current) {
      return null;
    }
    const newSettings = { ...current, ...partialSettings };
    const isLatestRequest = () => get().currentPromise === updatePromise;
    const updatePromise = updateSettings(newSettings).then((settings) => {
      isLatestRequest() && set({ current: settings });
      return settings;
    });
    set({ currentPromise: updatePromise });
  },
}));
