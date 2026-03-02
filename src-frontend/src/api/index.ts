const port = globalThis.__INJECTED__.server_port;
export const API_BASE = `http://localhost:${port}/`;

let resolveReady!: ()=>void
export const backendReady = new Promise<void>(r => resolveReady = r)
export const setBackendReady = () => resolveReady()
