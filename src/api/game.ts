import api from "@/services/api";

export interface StartGameResponse {
  message?: string;
  game_id?: number;
}

export interface GameCard {
  rank: string;
  suit: "clubs" | "diamonds" | "hearts" | "spades" | null;
}

export interface GamePlayerState {
  user_id: number;
  hand: GameCard[];
  has_declared: boolean;
  has_discarded: boolean;
  has_drawn: boolean;
  must_draw: boolean;
  laid_sets: GameCard[][];
  this_round_lost: number;
  // True once this player has called show-joker this round. From then on
  // every game-state response includes `wildcard_joker` for them.
  has_seen_joker: boolean;
}

export interface GameState {
  current_turn_user_id: number;
  discard_pile: GameCard[];
  draw_pile_count: number;
  losers: number[];
  player: GamePlayerState;
  round_number: number;
  status: string;
  winner: number | null;
  // Only present while status is "awaiting_scores" — the user_ids of every
  // non-winner player who still needs to submit their final hand for
  // scoring. A player is removed from this list the moment their score
  // submission lands.
  pending_declarations?: number[];
  // Only present once `player.has_seen_joker` is true — the rank that acts
  // as a wildcard for this round. Absent entirely for players who haven't
  // revealed it yet.
  wildcard_joker?: GameCard | null;
}

export type DrawSource = "deck" | "discard";

export interface DrawCardResponse {
  message?: string;
}

export interface DiscardCardResponse {
  message?: string;
}

export interface DeclareResponse {
  message?: string;
}

// Sent by the winner's declare, so this is what the same endpoint returns
// when the caller is one of the `pending_declarations` players submitting
// their final hand instead.
export interface SubmitScoreResponse {
  message?: string;
  user_id: number;
  points: number;
  round_finished: boolean;
}

export interface LaySetsResponse {
  message?: string;
}

export interface ShowJokerResponse {
  message?: string;
  joker?: GameCard;
}

export interface GameResultsPlayer {
  user_id: number;
  hand: GameCard[];
  laid_sets: GameCard[][];
  is_winner: boolean;
  this_round_lost: number;
  total_score: number;
}

export interface GameResultsResponse {
  // Every non-winner user_id still owing a score submission — once this is
  // empty, every player's laid_sets/total_score below is final for the
  // round.
  pending_declarations: number[];
  players: GameResultsPlayer[];
  round_number: number;
  status: string;
  wildcard_joker: GameCard | null;
  winner: number;
}

class Game {
  startGame = async (roomId: string) => {
    return api.post<StartGameResponse>("games/start", {
      room_id: Number(roomId),
    });
  };

  getGameState = async (gameId: string, userId: string) => {
    return api.get<GameState>(`games/${gameId}`, { user_id: userId });
  };

  drawCard = async (gameId: string, userId: string, source: DrawSource) => {
    return api.post<DrawCardResponse>(`games/${gameId}/draw`, {
      user_id: Number(userId),
      source,
    });
  };

  discardCard = async (gameId: string, userId: string, card: GameCard) => {
    return api.post<DiscardCardResponse>(`games/${gameId}/discard`, {
      user_id: Number(userId),
      card,
    });
  };

  // `card` is the one leftover card the player is declaring with — the same
  // single selected card Discard would otherwise take, just finishing the
  // hand instead of ending the turn.
  declare = async (gameId: string, userId: string, card: GameCard) => {
    return api.post<DeclareResponse>(`games/${gameId}/declare`, {
      user_id: Number(userId),
      card,
    });
  };

  // Phase 2 of the same endpoint: every other player (listed in
  // `pending_declarations`) submits their whole final hand — hand +
  // laid_sets combined, partitioned into groups, leftover singles as their
  // own 1-card group — for scoring. Nothing left uncovered: the API rejects
  // the call if cards are missing, extra, or don't match what they hold.
  submitScore = async (gameId: string, userId: string, sets: GameCard[][]) => {
    return api.post<SubmitScoreResponse>(`games/${gameId}/declare`, {
      user_id: Number(userId),
      sets,
    });
  };

  // Sends the player's entire set of groupings in one call — replaces
  // whatever `laid_sets` currently holds. Unvalidated: groups can be any
  // size (including 1 card) and there's no suit/sequence/rank requirement.
  laySets = async (gameId: string, userId: string, sets: GameCard[][]) => {
    return api.post<LaySetsResponse>(`games/${gameId}/lay-set`, {
      user_id: Number(userId),
      sets,
    });
  };

  // Reveals the wildcard joker. Mid-round this requires a genuine
  // 4-of-a-kind set (four cards of the same rank, no joker standing in for
  // any of them) — `set` is that group's 4 cards. Once the game has
  // finished, the reveal is open to everyone and no set is needed.
  showJoker = async (gameId: string, userId: string, set?: GameCard[]) => {
    return api.post<ShowJokerResponse>(`games/${gameId}/show-joker`, {
      user_id: Number(userId),
      ...(set ? { set } : {}),
    });
  };

  // Once a round's status is "finished", this is the breakdown of how it
  // ended — every player's final laid_sets, this round's loss, and running
  // total_score. Polled by the results screen until `pending_declarations`
  // empties out.
  getResults = async (gameId: string) => {
    return api.get<GameResultsResponse>(`games/${gameId}/results`);
  };
}

export const GAME = new Game();
