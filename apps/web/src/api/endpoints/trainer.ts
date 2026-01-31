import { fetchJson } from "../client";

export type TrainerPrompt = {
  prompt: string;
};

export function fetchTrainerPrompt() {
  return fetchJson<TrainerPrompt>("/api/trainer/prompt");
}
