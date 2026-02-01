import type { GameAction } from "./actions";
import type { DealTarget, Hand, Outcome, RoundState, Seat } from "./types";
import { payoutForOutcome } from "../rules/payoutRules";
import { shouldShuffle } from "../rules/shoeRules";
import { updateRunningCount } from "../counting/hiLo";
import { drawCard } from "./draw";
import { evaluateHand } from "./handValue";
import { createEmptyHand } from "./state";
import { createShoe, shuffle } from "./deck";
import { mulberry32 } from "./rng";

function replaceSeat(seats: Seat[], index: number, seat: Seat) {
  return seats.map((current, idx) => (idx === index ? seat : current));
}

function replaceHand(hands: Hand[], index: number, hand: Hand) {
  return hands.map((current, idx) => (idx === index ? hand : current));
}

function isPair(hand: Hand) {
  return hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank;
}

function canSplit(state: RoundState, seat: Seat, hand: Hand) {
  if (!state.rules.allowSplit) return false;
  if (!isPair(hand)) return false;
  if (seat.hands.length >= state.rules.maxHands) return false;
  if (seat.bankroll < hand.bet) return false;
  if (hand.splitFromAce && !state.rules.allowResplitAces) return false;
  if (hand.cards[0].rank === "A" && hand.isSplitChild && !state.rules.allowResplitAces) return false;
  return true;
}

function canDouble(state: RoundState, seat: Seat, hand: Hand) {
  if (!state.rules.allowDouble) return false;
  if (hand.isSplitChild && !state.rules.allowDoubleAfterSplit) return false;
  if (hand.cards.length !== 2) return false;
  if (seat.bankroll < hand.bet) return false;
  if (state.rules.doubleAllowedTotals) {
    const total = evaluateHand(hand.cards).total;
    if (!state.rules.doubleAllowedTotals.includes(total)) return false;
  }
  return true;
}

function drawFromShoe(state: RoundState) {
  const draw = drawCard(state.shoe);
  return {
    card: draw.card,
    shoe: draw.shoe,
    runningCount: updateRunningCount(state.runningCount, draw.card)
  };
}

function dealToSeatHand(state: RoundState, seatIndex: number, handIndex: number) {
  const draw = drawFromShoe(state);
  const seat = state.seats[seatIndex];
  const hand = seat.hands[handIndex];
  const updatedHand = evaluateActiveHand({
    ...hand,
    cards: [...hand.cards, draw.card]
  });

  const updatedSeat: Seat = {
    ...seat,
    hands: replaceHand(seat.hands, handIndex, updatedHand)
  };

  return {
    ...state,
    shoe: draw.shoe,
    runningCount: draw.runningCount,
    seats: replaceSeat(state.seats, seatIndex, updatedSeat)
  };
}

function dealToDealer(state: RoundState) {
  const draw = drawFromShoe(state);
  return {
    ...state,
    shoe: draw.shoe,
    runningCount: draw.runningCount,
    dealerHand: {
      ...state.dealerHand,
      cards: [...state.dealerHand.cards, draw.card]
    }
  };
}

function evaluateActiveHand(hand: Hand) {
  if (hand.status !== "ACTIVE") return hand;

  const value = evaluateHand(hand.cards);
  if (value.isBust) return { ...hand, status: "BUST" };
  if (value.isBlackjack && hand.cards.length === 2 && !hand.isSplitChild) {
    return { ...hand, status: "BLACKJACK" };
  }
  if (value.total === 21) return { ...hand, status: "STOOD" };
  return hand;
}

function getFirstActiveHandIndex(seat: Seat) {
  return seat.hands.findIndex((hand) => hand.status === "ACTIVE");
}

function buildDealQueue(roundSeatOrder: number[]): DealTarget[] {
  const queue: DealTarget[] = [];
  roundSeatOrder.forEach((seatIndex) => queue.push({ type: "SEAT", seatIndex }));
  queue.push({ type: "DEALER" });
  roundSeatOrder.forEach((seatIndex) => queue.push({ type: "SEAT", seatIndex }));
  queue.push({ type: "DEALER" });
  return queue;
}

function finishInitialDeal(state: RoundState): RoundState {
  const dealerValue = evaluateHand(state.dealerHand.cards);
  if (dealerValue.isBlackjack) {
    return settleRound(state);
  }

  const upcard = state.dealerHand.cards[0];
  if (upcard && upcard.rank === "A" && state.rules.allowInsurance) {
    const seats = state.seats.map((seat) =>
      state.roundSeatOrder.includes(seat.seatIndex)
        ? { ...seat, insuranceOffered: true }
        : { ...seat, insuranceOffered: false, insuranceBet: 0 }
    );
    const firstSeat = state.roundSeatOrder[0] ?? 0;
    return {
      ...state,
      seats,
      activeSeatIndex: firstSeat,
      phase: "INSURANCE"
    };
  }

  const firstSeat = state.roundSeatOrder[0] ?? 0;
  const seats = state.seats.map((seat) => {
    if (!state.roundSeatOrder.includes(seat.seatIndex)) return seat;
    return { ...seat, activeHandIndex: Math.max(0, getFirstActiveHandIndex(seat)) };
  });

  return {
    ...state,
    seats,
    activeSeatIndex: firstSeat,
    phase: "PLAYER_TURN"
  };
}

function findNextActiveSeat(state: RoundState, currentSeatIndex: number): {
  seatIndex: number;
  handIndex: number;
} | null {
  const order = state.roundSeatOrder;
  if (order.length === 0) return null;
  const startIdx = Math.max(0, order.indexOf(currentSeatIndex));
  const visit = [...order.slice(startIdx), ...order.slice(0, startIdx)];

  for (const seatIndex of visit) {
    const seat = state.seats[seatIndex];
    const handIndex = getFirstActiveHandIndex(seat);
    if (handIndex !== -1) {
      return { seatIndex, handIndex };
    }
  }

  return null;
}

function advanceAfterPlayerAction(state: RoundState): RoundState {
  const currentSeatIndex = state.activeSeatIndex;
  const currentSeat = state.seats[currentSeatIndex];
  const currentHandIndex = getFirstActiveHandIndex(currentSeat);

  if (currentHandIndex !== -1) {
    const updatedSeat = { ...currentSeat, activeHandIndex: currentHandIndex };
    return {
      ...state,
      seats: replaceSeat(state.seats, currentSeatIndex, updatedSeat)
    };
  }

  const next = findNextActiveSeat(state, currentSeatIndex);
  if (next) {
    const nextSeat = state.seats[next.seatIndex];
    const updatedSeat = { ...nextSeat, activeHandIndex: next.handIndex };
    return {
      ...state,
      activeSeatIndex: next.seatIndex,
      seats: replaceSeat(state.seats, next.seatIndex, updatedSeat)
    };
  }

  const anyCanWin = state.roundSeatOrder.some((seatIndex) =>
    state.seats[seatIndex].hands.some(
      (hand) => hand.status !== "BUST" && hand.status !== "SURRENDERED"
    )
  );

  if (!anyCanWin) {
    return settleRound(state);
  }

  return { ...state, phase: "DEALER_TURN" };
}

function dealerShouldHit(
  dealerValue: ReturnType<typeof evaluateHand>,
  standsOnSoft17: boolean
) {
  if (dealerValue.isBust) return false;
  if (dealerValue.total < 17) return true;
  if (dealerValue.total > 17) return false;
  if (dealerValue.isSoft && !standsOnSoft17) return true;
  return false;
}

function playDealer(state: RoundState) {
  let next = state;
  while (true) {
    const dealerValue = evaluateHand(next.dealerHand.cards);
    if (!dealerShouldHit(dealerValue, next.rules.dealerStandsOnSoft17)) break;
    next = dealToDealer(next);
  }
  return next;
}

function settleRound(state: RoundState): RoundState {
  const dealerValue = evaluateHand(state.dealerHand.cards);
  const dealerTotal = dealerValue.total;
  const dealerBust = dealerValue.isBust;
  const dealerBlackjack = dealerValue.isBlackjack;
  const tableCards = state.seats.flatMap((seat) => seat.hands.flatMap((hand) => hand.cards));
  const discard = [...state.discard, ...tableCards, ...state.dealerHand.cards];

  const results: { handIndex: number; seatIndex: number; outcome: Outcome; payout: number; playerTotal: number; dealerTotal: number }[] = [];
  const insurance: { seatIndex: number; bet: number; payout: number }[] = [];

  const updatedSeats = state.seats.map((seat) => {
    let seatPayout = 0;

    seat.hands.forEach((hand, index) => {
      if (hand.cards.length === 0) return;
      const playerValue = evaluateHand(hand.cards);
      let outcome: Outcome = "PUSH";

      if (hand.status === "SURRENDERED") {
        outcome = "SURRENDER";
      } else if (playerValue.isBust) {
        outcome = "LOSE";
      } else if (playerValue.isBlackjack && !dealerValue.isBlackjack) {
        outcome = "BLACKJACK";
      } else if (dealerValue.isBlackjack && !playerValue.isBlackjack) {
        outcome = "LOSE";
      } else if (dealerBust) {
        outcome = "WIN";
      } else if (playerValue.total > dealerTotal) {
        outcome = "WIN";
      } else if (playerValue.total < dealerTotal) {
        outcome = "LOSE";
      }

      const payout = payoutForOutcome(outcome, hand.bet, state.rules.blackjackPayout);
      seatPayout += payout;
      results.push({
        handIndex: index,
        seatIndex: seat.seatIndex,
        outcome,
        payout,
        playerTotal: playerValue.total,
        dealerTotal
      });
    });

    const insurancePayout =
      dealerBlackjack && seat.insuranceBet > 0 ? seat.insuranceBet * 3 : 0;
    if (seat.insuranceBet > 0) {
      insurance.push({ seatIndex: seat.seatIndex, bet: seat.insuranceBet, payout: insurancePayout });
    }

    return {
      ...seat,
      bankroll: seat.bankroll + seatPayout + insurancePayout,
      hands: seat.hands,
      activeHandIndex: 0,
      pendingBet: seat.pendingBet,
      ready: false,
      insuranceBet: 0,
      insuranceOffered: false,
      skippedRound: seat.skippedRound
    };
  });

  return {
    ...state,
    seats: updatedSeats,
    discard,
    lastResult: {
      hands: results,
      dealerTotal,
      dealerBust,
      dealerBlackjack,
      insurance
    },
    phase: "BETTING",
    activeSeatIndex: 0,
    roundSeatOrder: [],
    dealQueue: []
  };
}

function reshuffleShoe(state: RoundState, seed: number): RoundState {
  const shoe = shuffle(createShoe(state.rules.decks), mulberry32(seed));
  return {
    ...state,
    phase: "BETTING",
    shoe,
    discard: [],
    runningCount: 0,
    seats: state.seats.map((seat) => ({
      ...seat,
      hands: [],
      activeHandIndex: 0,
      pendingBet: 0,
      ready: false,
      insuranceBet: 0,
      insuranceOffered: false,
      skippedRound: false
    })),
    dealerHand: createEmptyHand(0),
    activeSeatIndex: 0,
    dealQueue: [],
    roundSeatOrder: [],
    lastResult: undefined
  };
}

function applyDealStep(state: RoundState): RoundState {
  if (state.dealQueue.length === 0) return state;
  const [nextTarget, ...rest] = state.dealQueue;
  let nextState = { ...state, dealQueue: rest };

  if (nextTarget.type === "DEALER") {
    nextState = dealToDealer(nextState);
  } else {
    nextState = dealToSeatHand(nextState, nextTarget.seatIndex, 0);
  }

  if (nextState.dealQueue.length === 0) {
    return finishInitialDeal(nextState);
  }

  return nextState;
}

function getNextInsuranceSeat(state: RoundState, currentSeatIndex: number): number | null {
  const order = state.roundSeatOrder;
  const startIdx = Math.max(0, order.indexOf(currentSeatIndex));
  const visit = [...order.slice(startIdx + 1), ...order.slice(0, startIdx + 1)];
  for (const seatIndex of visit) {
    const seat = state.seats[seatIndex];
    if (seat.insuranceOffered) return seatIndex;
  }
  return null;
}

export function reduce(state: RoundState, action: GameAction): RoundState {
  switch (action.type) {
    case "ADD_SEAT": {
      if (state.phase !== "BETTING") return state;
      if (state.seats.length >= 7) return state;
      const bankroll = state.seats[0]?.bankroll ?? 1000;
      const seatIndex = state.seats.length;
      const newSeat: Seat = {
        seatIndex,
        bankroll,
        pendingBet: 0,
        ready: false,
        hands: [],
        activeHandIndex: 0,
        insuranceBet: 0,
        insuranceOffered: false,
        skippedRound: false
      };
      return { ...state, seats: [...state.seats, newSeat] };
    }
    case "SET_BET": {
      if (state.phase !== "BETTING") return state;
      const seat = state.seats[action.seatIndex];
      if (!seat) return state;
      const amount = Math.max(0, action.amount);
      const updatedSeat = {
        ...seat,
        pendingBet: amount,
        ready: seat.ready ? false : seat.ready
      };
      return { ...state, seats: replaceSeat(state.seats, action.seatIndex, updatedSeat) };
    }
    case "TOGGLE_READY": {
      if (state.phase !== "BETTING") return state;
      const seat = state.seats[action.seatIndex];
      if (!seat) return state;
      const canReady = seat.pendingBet > 0 && seat.pendingBet <= seat.bankroll;
      const updatedSeat = { ...seat, ready: action.ready && canReady };
      return { ...state, seats: replaceSeat(state.seats, action.seatIndex, updatedSeat) };
    }
    case "PLACE_BET": {
      if (state.phase !== "BETTING") return state;
      const seat = state.seats[0];
      if (!seat) return state;
      const amount = action.amount;
      const updatedSeat = { ...seat, pendingBet: amount, ready: false };
      return { ...state, seats: replaceSeat(state.seats, 0, updatedSeat) };
    }
    case "BEGIN_DEAL": {
      if (state.phase !== "BETTING") return state;
      const participants = state.seats.filter(
        (seat) => seat.ready && seat.pendingBet > 0 && seat.pendingBet <= seat.bankroll
      );
      if (participants.length === 0) return state;

      let workingState = state;
      if (
        shouldShuffle(state.shoe, state.discard, {
          decks: state.rules.decks,
          penetration: state.rules.penetration
        })
      ) {
        const seed = Math.floor(Math.random() * 2 ** 32);
        workingState = {
          ...state,
          shoe: shuffle(createShoe(state.rules.decks), mulberry32(seed)),
          discard: [],
          runningCount: 0
        };
      }

      const roundSeatOrder = participants.map((seat) => seat.seatIndex);
      const seats = workingState.seats.map((seat) => {
        if (!roundSeatOrder.includes(seat.seatIndex)) {
          const skippedRound = seat.pendingBet > 0 || seat.ready;
          return { ...seat, skippedRound, ready: false, hands: [] };
        }
        const bet = seat.pendingBet;
        return {
          ...seat,
          bankroll: seat.bankroll - bet,
          pendingBet: 0,
          ready: false,
          hands: [createEmptyHand(bet)],
          activeHandIndex: 0,
          insuranceBet: 0,
          insuranceOffered: false,
          skippedRound: false
        };
      });

      const nextRoundId = workingState.lastResult ? workingState.roundId + 1 : workingState.roundId;

      return {
        ...workingState,
        phase: "DEALING",
        seats,
        dealerHand: createEmptyHand(0),
        activeSeatIndex: roundSeatOrder[0] ?? 0,
        dealQueue: buildDealQueue(roundSeatOrder),
        roundSeatOrder,
        lastResult: undefined,
        roundId: nextRoundId
      };
    }
    case "DEAL_STEP": {
      if (state.phase !== "DEALING") return state;
      return applyDealStep(state);
    }
    case "DEAL": {
      if (state.phase !== "BETTING") return state;
      let next = reduce(state, { type: "BEGIN_DEAL" });
      if (next.phase !== "DEALING") return next;
      while (next.dealQueue.length > 0) {
        next = applyDealStep(next);
      }
      return next;
    }
    case "HIT": {
      if (state.phase !== "PLAYER_TURN") return state;
      const seat = state.seats[state.activeSeatIndex];
      if (!seat) return state;
      const hand = seat.hands[seat.activeHandIndex];
      if (!hand || hand.status !== "ACTIVE") return state;

      const next = dealToSeatHand(state, state.activeSeatIndex, seat.activeHandIndex);
      const updatedSeat = next.seats[next.activeSeatIndex];
      const updatedHand = updatedSeat.hands[updatedSeat.activeHandIndex];
      if (updatedHand.status !== "ACTIVE") {
        return advanceAfterPlayerAction(next);
      }
      return next;
    }
    case "STAND": {
      if (state.phase !== "PLAYER_TURN") return state;
      const seat = state.seats[state.activeSeatIndex];
      if (!seat) return state;
      const hand = seat.hands[seat.activeHandIndex];
      if (!hand || hand.status !== "ACTIVE") return state;

      const updatedHand = { ...hand, status: "STOOD" };
      const updatedSeat = {
        ...seat,
        hands: replaceHand(seat.hands, seat.activeHandIndex, updatedHand)
      };
      const next = { ...state, seats: replaceSeat(state.seats, seat.seatIndex, updatedSeat) };
      return advanceAfterPlayerAction(next);
    }
    case "DOUBLE": {
      if (state.phase !== "PLAYER_TURN") return state;
      const seat = state.seats[state.activeSeatIndex];
      if (!seat) return state;
      const hand = seat.hands[seat.activeHandIndex];
      if (!hand || hand.status !== "ACTIVE") return state;
      if (!canDouble(state, seat, hand)) return state;

      let updatedSeat: Seat = {
        ...seat,
        bankroll: seat.bankroll - hand.bet,
        hands: replaceHand(seat.hands, seat.activeHandIndex, {
          ...hand,
          bet: hand.bet * 2,
          isDoubled: true
        })
      };

      let next = { ...state, seats: replaceSeat(state.seats, seat.seatIndex, updatedSeat) };
      next = dealToSeatHand(next, seat.seatIndex, seat.activeHandIndex);
      const doubledSeat = next.seats[seat.seatIndex];
      const doubledHand = doubledSeat.hands[doubledSeat.activeHandIndex];
      const finalHand = {
        ...doubledHand,
        status: doubledHand.status === "BUST" ? "BUST" : "STOOD"
      };
      updatedSeat = {
        ...doubledSeat,
        hands: replaceHand(doubledSeat.hands, doubledSeat.activeHandIndex, finalHand)
      };
      next = { ...next, seats: replaceSeat(next.seats, seat.seatIndex, updatedSeat) };
      return advanceAfterPlayerAction(next);
    }
    case "SPLIT": {
      if (state.phase !== "PLAYER_TURN") return state;
      const seat = state.seats[state.activeSeatIndex];
      if (!seat) return state;
      const hand = seat.hands[seat.activeHandIndex];
      if (!hand || hand.status !== "ACTIVE") return state;
      if (!canSplit(state, seat, hand)) return state;

      const [firstCard, secondCard] = hand.cards;
      const splitFromAce = hand.splitFromAce || firstCard.rank === "A";
      const leftHand: Hand = {
        ...createEmptyHand(hand.bet),
        cards: [firstCard],
        isSplitChild: true,
        splitFromAce
      };
      const rightHand: Hand = {
        ...createEmptyHand(hand.bet),
        cards: [secondCard],
        isSplitChild: true,
        splitFromAce
      };

      const hands = [
        ...seat.hands.slice(0, seat.activeHandIndex),
        leftHand,
        rightHand,
        ...seat.hands.slice(seat.activeHandIndex + 1)
      ];

      let updatedSeat: Seat = {
        ...seat,
        bankroll: seat.bankroll - hand.bet,
        hands,
        activeHandIndex: seat.activeHandIndex
      };

      let next = { ...state, seats: replaceSeat(state.seats, seat.seatIndex, updatedSeat) };
      next = dealToSeatHand(next, seat.seatIndex, updatedSeat.activeHandIndex);
      next = dealToSeatHand(next, seat.seatIndex, updatedSeat.activeHandIndex + 1);

      const nextSeat = next.seats[seat.seatIndex];
      if (splitFromAce && !state.rules.allowHitSplitAces) {
        const left = { ...nextSeat.hands[updatedSeat.activeHandIndex], status: "STOOD" };
        const right = { ...nextSeat.hands[updatedSeat.activeHandIndex + 1], status: "STOOD" };
        updatedSeat = {
          ...nextSeat,
          hands: replaceHand(
            replaceHand(nextSeat.hands, updatedSeat.activeHandIndex, left),
            updatedSeat.activeHandIndex + 1,
            right
          )
        };
        next = { ...next, seats: replaceSeat(next.seats, seat.seatIndex, updatedSeat) };
        return advanceAfterPlayerAction(next);
      }

      return advanceAfterPlayerAction(next);
    }
    case "SURRENDER": {
      if (state.phase !== "PLAYER_TURN") return state;
      if (!state.rules.allowSurrender) return state;
      const seat = state.seats[state.activeSeatIndex];
      if (!seat) return state;
      const hand = seat.hands[seat.activeHandIndex];
      if (!hand || hand.status !== "ACTIVE") return state;
      if (hand.cards.length !== 2) return state;

      const updatedHand = { ...hand, status: "SURRENDERED" };
      const updatedSeat = {
        ...seat,
        hands: replaceHand(seat.hands, seat.activeHandIndex, updatedHand)
      };
      const next = { ...state, seats: replaceSeat(state.seats, seat.seatIndex, updatedSeat) };
      return advanceAfterPlayerAction(next);
    }
    case "TAKE_INSURANCE": {
      if (state.phase !== "INSURANCE") return state;
      const seat = state.seats[state.activeSeatIndex];
      if (!seat || !seat.insuranceOffered || !state.rules.allowInsurance) return state;
      const baseBet = seat.hands[0]?.bet ?? 0;
      const maxBet = baseBet / 2;
      const amount = Math.min(action.amount, maxBet, seat.bankroll);
      if (amount <= 0) return state;

      const updatedSeat = {
        ...seat,
        bankroll: seat.bankroll - amount,
        insuranceBet: amount,
        insuranceOffered: false
      };
      let nextState = { ...state, seats: replaceSeat(state.seats, seat.seatIndex, updatedSeat) };

      const nextSeatIndex = getNextInsuranceSeat(nextState, seat.seatIndex);
      if (nextSeatIndex !== null) {
        return { ...nextState, activeSeatIndex: nextSeatIndex };
      }

      const dealerValue = evaluateHand(state.dealerHand.cards);
      if (dealerValue.isBlackjack) {
        return settleRound(nextState);
      }

      const firstSeat = nextState.roundSeatOrder[0] ?? 0;
      return { ...nextState, activeSeatIndex: firstSeat, phase: "PLAYER_TURN" };
    }
    case "DECLINE_INSURANCE": {
      if (state.phase !== "INSURANCE") return state;
      const seat = state.seats[state.activeSeatIndex];
      if (!seat || !state.rules.allowInsurance) return state;

      const updatedSeat = {
        ...seat,
        insuranceBet: 0,
        insuranceOffered: false
      };
      let nextState = { ...state, seats: replaceSeat(state.seats, seat.seatIndex, updatedSeat) };

      const nextSeatIndex = getNextInsuranceSeat(nextState, seat.seatIndex);
      if (nextSeatIndex !== null) {
        return { ...nextState, activeSeatIndex: nextSeatIndex };
      }

      const dealerValue = evaluateHand(state.dealerHand.cards);
      if (dealerValue.isBlackjack) {
        return settleRound(nextState);
      }

      const firstSeat = nextState.roundSeatOrder[0] ?? 0;
      return { ...nextState, activeSeatIndex: firstSeat, phase: "PLAYER_TURN" };
    }
    case "DEALER_PLAY": {
      if (state.phase !== "DEALER_TURN") return state;
      const played = playDealer(state);
      return settleRound(played);
    }
    case "DEALER_TICK": {
      if (state.phase !== "DEALER_TURN") return state;
      const dealerValue = evaluateHand(state.dealerHand.cards);
      if (dealerShouldHit(dealerValue, state.rules.dealerStandsOnSoft17)) {
        return dealToDealer(state);
      }
      return settleRound(state);
    }
    case "END_ROUND": {
      return {
        ...state,
        phase: "BETTING",
        seats: state.seats.map((seat) => ({
          ...seat,
          hands: [],
          activeHandIndex: 0,
          pendingBet: seat.pendingBet,
          ready: false,
          insuranceBet: 0,
          insuranceOffered: false,
          skippedRound: false
        })),
        dealerHand: createEmptyHand(0),
        activeSeatIndex: 0,
        roundSeatOrder: [],
        dealQueue: []
      };
    }
    case "RESHUFFLE": {
      if (state.phase !== "BETTING") return state;
      return reshuffleShoe(state, action.seed);
    }
    case "SET_RULES": {
      if (state.phase !== "BETTING") return state;
      return { ...state, rules: { ...state.rules, ...action.rules } };
    }
    default:
      return state;
  }
}
