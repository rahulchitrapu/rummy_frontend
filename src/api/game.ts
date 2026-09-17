import api from "@/services/api";

export interface StartGameResponse {
  message?: string;
  game_id?: number;
}

export interface GamePlayerHand {
  user_id: number;
  hand_count: number;
}

export interface GameState {
  game_id: number;
  hand: any[];
  discard_pile: any[];
  turn_order: number[];
  current_player_index: number;
  players: GamePlayerHand[];
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
}

export const GAME = new Game();
