const port = globalThis.__INJECTED__?.server_port;
let api_base: string;
if (port !== undefined) {
  api_base = `http://localhost:${port}/`;
} else {
  api_base = location.href;
}
export const API_BASE = api_base;

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
}
export const BackendReadyPromise = backendReady();
