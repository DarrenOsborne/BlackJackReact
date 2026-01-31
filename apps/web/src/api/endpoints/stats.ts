import { fetchJson } from "../client";

export type StatsResponse = {
  bankroll: number;
};

export function fetchStats() {
  return fetchJson<StatsResponse>("/api/stats");
}
