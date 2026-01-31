import type { RoundState } from "../engine/model/types";

export function selectActiveHand(state: RoundState) {
  return state.playerHands[state.activeHandIndex];
}
