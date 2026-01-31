import { fetchJson } from "../client";

export type SessionResponse = {
  sessionId: string;
};

export function createSession() {
  return fetchJson<SessionResponse>("/api/sessions", { method: "POST" });
}
