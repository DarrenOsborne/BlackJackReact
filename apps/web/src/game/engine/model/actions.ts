import type { Rules } from "./types";

export type GameAction =
  | { type: "ADD_SEAT" }
  | { type: "SET_BET"; seatIndex: number; amount: number }
  | { type: "TOGGLE_READY"; seatIndex: number; ready: boolean }
  | { type: "PLACE_BET"; amount: number }
  | { type: "DEAL" }
  | { type: "BEGIN_DEAL" }
  | { type: "DEAL_STEP" }
  | { type: "HIT" }
  | { type: "STAND" }
  | { type: "DOUBLE" }
  | { type: "SPLIT" }
  | { type: "SURRENDER" }
  | { type: "TAKE_INSURANCE"; amount: number }
  | { type: "DECLINE_INSURANCE" }
  | { type: "DEALER_PLAY" }
  | { type: "DEALER_TICK" }
  | { type: "END_ROUND" }
  | { type: "RESHUFFLE"; seed: number }
  | { type: "SET_RULES"; rules: Partial<Rules> };