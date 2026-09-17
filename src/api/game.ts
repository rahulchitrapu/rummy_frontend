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

  declare = async (gameId: string, userId: string) => {
    return api.post<DeclareResponse>(`games/${gameId}/declare`, {
      user_id: Number(userId),
    });
  };
}

export const GAME = new Game();
