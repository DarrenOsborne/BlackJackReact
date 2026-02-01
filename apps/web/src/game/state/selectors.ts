import type { RoundState } from "../engine/model/types";

export function selectActiveHand(state: RoundState) {
  const seat = state.seats[state.activeSeatIndex];
  return seat?.hands[seat.activeHandIndex];
}
