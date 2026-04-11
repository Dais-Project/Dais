import { create } from "zustand";
import type { AppSettings } from "@/api/generated/schemas";
import { getSettings, updateSettings } from "@/api/settings";
import { BackendReadyPromise } from "@/api";

type ServerSettingsStore = {
  current: AppSettings | null;
  currentPromise: Promise<AppSettings>;
  isLoading: boolean;
  reload: () => Promise<void>;
  setPartial: (settings: Partial<AppSettings>) => Promise<AppSettings> | null;
};

export const useServerSettingsStore = create<ServerSettingsStore>()((set, get) => ({
  current: null,
  currentPromise: (async () => {
    await BackendReadyPromise;
    const settings = await getSettings();
    set({ current: settings, isLoading: false });
    return settings;
  })(),
  isLoading: true,
  async reload() {
    const promise = getSettings();
    const isLatestRequest = () => get().currentPromise === promise;
    set({ isLoading: true, currentPromise: promise });
    try {
      const settings = await promise;
      isLatestRequest() && set({ current: settings });
    } catch (error) {
      console.error(`Failed to fetch server settings:`, error);
      throw error;
    } finally {
      isLatestRequest() && set({ isLoading: false });
    }
  },
  setPartial(partialSettings) {
    const current = get().current;
    if (!current) {
      return null;
    }
    const newSettings = { ...current, ...partialSettings };
    const isLatestRequest = () => get().currentPromise === updatePromise;
    const updatePromise = updateSettings(newSettings).then((settings) => {
      isLatestRequest() && set({ current: settings, isLoading: false });
      return settings;
    });
    set({ currentPromise: updatePromise });
    return updatePromise;
  },
}));
