const port = globalThis.__INJECTED__.server_port;
export const API_BASE = `http://localhost:${port}/`;

import { getHealth } from "./generated/endpoints/health/health";
async function backendReady() {
  const interval = 1000;
  while (true) {
    try {
      const result = await getHealth({
        cache: "no-store",
      });
      if (result.status === "ok") {
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};
export const BackendReadyPromise = backendReady();
