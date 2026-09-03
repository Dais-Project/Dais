import { safeUuid } from "./safe-uuid";

export const CLIENT_ID_HEADER = "X-Client-ID";
export const clientId = safeUuid();
