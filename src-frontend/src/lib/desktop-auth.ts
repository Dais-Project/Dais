export const DESKTOP_AUTH_HEADER = "X-Dais-Desktop-Token";

export function getDesktopAuthHeaders(): Record<string, string> {
  const token = globalThis.__INJECTED__?.desktop_auth_token;
  if (token === undefined) return {};
  return { [DESKTOP_AUTH_HEADER]: token };
}
