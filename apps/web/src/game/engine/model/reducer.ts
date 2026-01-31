import type { GameAction } from "./actions";
import type { Hand, Outcome, RoundState } from "./types";
import { payoutForOutcome } from "../rules/payoutRules";
import { shouldShuffle } from "../rules/shoeRules";
import { updateRunningCount } from "../counting/hiLo";
import { drawCard } from "./draw";
import { evaluateHand } from "./handValue";
import { createEmptyHand } from "./state";
import { createShoe, shuffle } from "./deck";
import { mulberry32 } from "./rng";

function replaceHand(hands: Hand[], index: number, hand: Hand) {
  return hands.map((current, idx) => (idx === index ? hand : current));
}

function isPair(hand: Hand) {
  return hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank;
}

function canSplit(state: RoundState, hand: Hand) {
  if (!state.rules.allowSplit) return false;
  if (!isPair(hand)) return false;
  if (state.playerHands.length >= state.rules.maxHands) return false;
  if (state.bankroll < hand.bet) return false;
  if (hand.splitFromAce && !state.rules.allowResplitAces) return false;
  if (hand.cards[0].rank === "A" && hand.isSplitChild && !state.rules.allowResplitAces) return false;
  return true;
}

function canDouble(state: RoundState, hand: Hand) {
  if (!state.rules.allowDouble) return false;
  if (hand.isSplitChild && !state.rules.allowDoubleAfterSplit) return false;
  if (hand.cards.length !== 2) return false;
  if (state.bankroll < hand.bet) return false;
  if (state.rules.doubleAllowedTotals) {
    const total = evaluateHand(hand.cards).total;
    if (!state.rules.doubleAllowedTotals.includes(total)) return false;
  }
  return true;
}

function settleIfBlackjack(state: RoundState) {
  const playerValue = evaluateHand(state.playerHands[0].cards);
  const dealerValue = evaluateHand(state.dealerHand.cards);

  if (!playerValue.isBlackjack && !dealerValue.isBlackjack) {
    return null;
  }

  const dealerHand = dealerValue.isBlackjack
    ? { ...state.dealerHand, status: "BLACKJACK" }
    : state.dealerHand;

  return settleRound({ ...state, dealerHand });
}

function drawFromShoe(state: RoundState) {
  const draw = drawCard(state.shoe);
  return {
    card: draw.card,
    shoe: draw.shoe,
    runningCount: updateRunningCount(state.runningCount, draw.card)
  };
}

function dealToPlayer(state: RoundState, handIndex: number) {
  const draw = drawFromShoe(state);
  const hand = state.playerHands[handIndex];
  const updatedHand = evaluateActiveHand({
    ...hand,
    cards: [...hand.cards, draw.card]
  });

  return {
    ...state,
    shoe: draw.shoe,
    runningCount: draw.runningCount,
    playerHands: replaceHand(state.playerHands, handIndex, updatedHand)
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

function settleRound(state: RoundState): RoundState {
  const dealerValue = evaluateHand(state.dealerHand.cards);
  const dealerTotal = dealerValue.total;
  const dealerBust = dealerValue.isBust;
  const dealerBlackjack = dealerValue.isBlackjack;
  const tableCards = state.playerHands.flatMap((hand) => hand.cards);
  const discard = [...state.discard, ...tableCards, ...state.dealerHand.cards];

  const results = state.playerHands.map((hand, index) => {
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

    return {
      handIndex: index,
      outcome,
      payout,
      playerTotal: playerValue.total,
      dealerTotal
    };
  });

  const bankroll = state.bankroll + results.reduce((sum, result) => sum + result.payout, 0);
  const insurancePayout =
    dealerBlackjack && state.insuranceBet > 0 ? state.insuranceBet * 3 : 0;

  return {
    ...state,
    bankroll: bankroll + insurancePayout,
    discard,
    lastResult: {
      hands: results,
      dealerTotal,
      dealerBust,
      dealerBlackjack,
      insuranceBet: state.insuranceBet,
      insurancePayout
    },
    phase: "BETTING",
    activeHandIndex: 0,
    insuranceOffered: false
  };
}

function findNextActiveHandIndex(state: RoundState) {
  return state.playerHands.findIndex((hand) => hand.status === "ACTIVE");
}

function advanceAfterPlayerAction(state: RoundState): RoundState {
  const nextActiveIndex = findNextActiveHandIndex(state);
  if (nextActiveIndex !== -1) {
    return { ...state, activeHandIndex: nextActiveIndex };
  }

  const anyCanWin = state.playerHands.some(
    (hand) => hand.status !== "BUST" && hand.status !== "SURRENDERED"
  );

  if (!anyCanWin) {
    return settleRound(state);
  }

  return { ...state, phase: "DEALER_TURN" };
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

function reshuffleShoe(state: RoundState, seed: number): RoundState {
  const shoe = shuffle(createShoe(state.rules.decks), mulberry32(seed));
  return {
    ...state,
    phase: "BETTING",
    shoe,
    discard: [],
    runningCount: 0,
    playerHands: [],
    dealerHand: createEmptyHand(0),
    activeHandIndex: 0,
    pendingBet: 0,
    insuranceBet: 0,
    insuranceOffered: false,
    lastResult: undefined
  };
}

export function reduce(state: RoundState, action: GameAction): RoundState {
  switch (action.type) {
    case "PLACE_BET": {
      if (state.phase !== "BETTING") return state;
      if (state.pendingBet !== 0) return state;
      if (action.amount <= 0 || action.amount > state.bankroll) return state;

      return {
        ...state,
        pendingBet: action.amount,
        bankroll: state.bankroll - action.amount
      };
    }
    case "DEAL": {
      if (state.phase !== "BETTING") return state;
      if (state.pendingBet <= 0) return state;

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

      const bet = workingState.pendingBet;
      const nextRoundId = workingState.lastResult ? workingState.roundId + 1 : workingState.roundId;
      let next: RoundState = {
        ...workingState,
        phase: "DEALING",
        pendingBet: 0,
        insuranceBet: 0,
        insuranceOffered: false,
        playerHands: [createEmptyHand(bet)],
        dealerHand: createEmptyHand(0),
        activeHandIndex: 0,
        lastResult: undefined,
        roundId: nextRoundId
      };

      next = dealToPlayer(next, 0);
      next = dealToDealer(next);
      next = dealToPlayer(next, 0);
      next = dealToDealer(next);

      const upcard = next.dealerHand.cards[0];
      if (upcard && upcard.rank === "A" && next.rules.allowInsurance) {
        return { ...next, phase: "INSURANCE", insuranceOffered: true };
      }

      const blackjackSettlement = settleIfBlackjack(next);
      if (blackjackSettlement) return blackjackSettlement;

      return { ...next, phase: "PLAYER_TURN" };
    }
    case "HIT": {
      if (state.phase !== "PLAYER_TURN") return state;
      const hand = state.playerHands[state.activeHandIndex];
      if (!hand || hand.status !== "ACTIVE") return state;

      const next = dealToPlayer(state, state.activeHandIndex);
      const updatedHand = next.playerHands[next.activeHandIndex];

      if (updatedHand.status !== "ACTIVE") {
        return advanceAfterPlayerAction(next);
      }
      return next;
    }
    case "STAND": {
      if (state.phase !== "PLAYER_TURN") return state;
      const hand = state.playerHands[state.activeHandIndex];
      if (!hand || hand.status !== "ACTIVE") return state;

      const updatedHand = { ...hand, status: "STOOD" };
      const next = {
        ...state,
        playerHands: replaceHand(state.playerHands, state.activeHandIndex, updatedHand)
      };

      return advanceAfterPlayerAction(next);
    }
    case "DOUBLE": {
      if (state.phase !== "PLAYER_TURN") return state;
      const hand = state.playerHands[state.activeHandIndex];
      if (!hand || hand.status !== "ACTIVE") return state;
      if (!canDouble(state, hand)) return state;

      let next: RoundState = {
        ...state,
        bankroll: state.bankroll - hand.bet,
        playerHands: replaceHand(state.playerHands, state.activeHandIndex, {
          ...hand,
          bet: hand.bet * 2,
          isDoubled: true
        })
      };

      next = dealToPlayer(next, next.activeHandIndex);

      const doubledHand = next.playerHands[next.activeHandIndex];
      const finalHand = {
        ...doubledHand,
        status: doubledHand.status === "BUST" ? "BUST" : "STOOD"
      };

      next = {
        ...next,
        playerHands: replaceHand(next.playerHands, next.activeHandIndex, finalHand)
      };

      return advanceAfterPlayerAction(next);
    }
    case "SPLIT": {
      if (state.phase !== "PLAYER_TURN") return state;
      const hand = state.playerHands[state.activeHandIndex];
      if (!hand || hand.status !== "ACTIVE") return state;
      if (!canSplit(state, hand)) return state;

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
        ...state.playerHands.slice(0, state.activeHandIndex),
        leftHand,
        rightHand,
        ...state.playerHands.slice(state.activeHandIndex + 1)
      ];

      let next: RoundState = {
        ...state,
        bankroll: state.bankroll - hand.bet,
        playerHands: hands,
        activeHandIndex: state.activeHandIndex
      };

      next = dealToPlayer(next, state.activeHandIndex);
      next = dealToPlayer(next, state.activeHandIndex + 1);

      if (splitFromAce && !state.rules.allowHitSplitAces) {
        const left = { ...next.playerHands[state.activeHandIndex], status: "STOOD" };
        const right = { ...next.playerHands[state.activeHandIndex + 1], status: "STOOD" };
        next = {
          ...next,
          playerHands: replaceHand(
            replaceHand(next.playerHands, state.activeHandIndex, left),
            state.activeHandIndex + 1,
            right
          )
        };
        return advanceAfterPlayerAction(next);
      }

      const updatedHand = next.playerHands[next.activeHandIndex];
      if (updatedHand.status !== "ACTIVE") {
        return advanceAfterPlayerAction(next);
      }
      return next;
    }
    case "SURRENDER": {
      if (state.phase !== "PLAYER_TURN") return state;
      if (!state.rules.allowSurrender) return state;

      const hand = state.playerHands[state.activeHandIndex];
      if (!hand || hand.status !== "ACTIVE") return state;
      if (hand.cards.length !== 2) return state;

      const updatedHand = { ...hand, status: "SURRENDERED" };
      const next = {
        ...state,
        playerHands: replaceHand(state.playerHands, state.activeHandIndex, updatedHand)
      };

      return advanceAfterPlayerAction(next);
    }
    case "TAKE_INSURANCE": {
      if (state.phase !== "INSURANCE") return state;
      if (!state.insuranceOffered || !state.rules.allowInsurance) return state;

      const baseBet = state.playerHands[0]?.bet ?? 0;
      const maxBet = baseBet / 2;
      const amount = Math.min(action.amount, maxBet, state.bankroll);
      if (amount <= 0) return state;

      const next = {
        ...state,
        bankroll: state.bankroll - amount,
        insuranceBet: amount,
        insuranceOffered: false
      };

      const blackjackSettlement = settleIfBlackjack(next);
      if (blackjackSettlement) return blackjackSettlement;

      return { ...next, phase: "PLAYER_TURN" };
    }
    case "DECLINE_INSURANCE": {
      if (state.phase !== "INSURANCE") return state;

      const next = {
        ...state,
        insuranceBet: 0,
        insuranceOffered: false
      };

      const blackjackSettlement = settleIfBlackjack(next);
      if (blackjackSettlement) return blackjackSettlement;

      return { ...next, phase: "PLAYER_TURN" };
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
        playerHands: [],
        dealerHand: createEmptyHand(0),
        activeHandIndex: 0,
        pendingBet: 0,
        insuranceBet: 0,
        insuranceOffered: false,
        roundId: state.roundId + 1
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
