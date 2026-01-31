import type { GameAction } from "../engine/model/actions";
import type { RoundState } from "../engine/model/types";

export type GameDispatch = (action: GameAction) => void;
export type GameStore = {
  state: RoundState;
  dispatch: GameDispatch;
};
