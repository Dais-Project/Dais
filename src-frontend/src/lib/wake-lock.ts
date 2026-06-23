import {
  disableKeepAwake as disableTauriKeepAwake,
  enableKeepAwake as enableTauriKeepAwake,
  isTauri,
} from "./tauri";

class WebWakeLock {
  private sentinel: WakeLockSentinel | null = null;
  private releaseListeners = new Set<() => void>();

  get enabled() {
    return this.sentinel !== null;
  }

  onRelease(listener: () => void) {
    this.releaseListeners.add(listener);
    return () => {
      this.releaseListeners.delete(listener);
    };
  }

  async enable() {
    if (this.sentinel) {
      return true;
    }
    if (!("wakeLock" in navigator)) {
      return false;
    }

    try {
      const sentinel = await navigator.wakeLock.request("screen");
      this.sentinel = sentinel;
      sentinel.addEventListener("release", () => {
        if (this.sentinel !== sentinel) {
          return;
        }
        this.sentinel = null;
        this.releaseListeners.forEach((listener) => {
          listener();
        });
      });
      return true;
    } catch {
      return false;
    }
  }

  async disable() {
    const sentinel = this.sentinel;
    this.sentinel = null;
    await sentinel?.release();
  }
}

const noop = (): void => undefined;

// --- --- --- --- --- ---

export type WakeLockHandle = {
  release: () => Promise<void>;
};

export class WakeLock {
  private referenceCount = 0;
  private wakeLockOperation = Promise.resolve();
  private webWakeLock = new WebWakeLock();

  constructor() {
    this.webWakeLock.onRelease(() => {
      this.referenceCount = 0;
    });
  }

  async acquire() {
    return await this.runWakeLockOperation(async () => {
      if (this.referenceCount > 0) {
        this.referenceCount += 1;
        return true;
      }

      const enabled = await this.enableWakeLock();
      if (!enabled) {
        return false;
      }

      this.referenceCount += 1;
      return true;
    });
  }

  async acquireScoped(): Promise<WakeLockHandle | null> {
    const acquired = await this.acquire();
    if (!acquired) {
      return null;
    }

    let released = false;
    return {
      release: async () => {
        if (released) {
          return;
        }

        released = true;
        await this.release();
      },
    };
  }

  async release() {
    await this.runWakeLockOperation(async () => {
      if (this.referenceCount === 0) {
        return;
      }

      if (this.referenceCount > 1) {
        this.referenceCount -= 1;
        return;
      }

      await this.disableWakeLock();
      this.referenceCount = 0;
    });
  }

  getReferenceCount() {
    return this.referenceCount;
  }

  private runWakeLockOperation<T>(operation: () => Promise<T>) {
    const nextOperation = this.wakeLockOperation.then(operation, operation);
    this.wakeLockOperation = nextOperation.then(noop, noop);
    return nextOperation;
  }

  private async enableWakeLock() {
    if (isTauri) {
      await enableTauriKeepAwake();
      return true;
    }
    return await this.webWakeLock.enable();
  }

  private async disableWakeLock() {
    if (isTauri) {
      await disableTauriKeepAwake();
      return;
    }
    await this.webWakeLock.disable();
  }
}

export const wakeLock = new WakeLock();
