import api from "@/services/api";
import { CrossPlatformStorage } from "@/utils/storage";

export interface CreateRoomResponse {
  room_id: string;
}

export interface RoomSummary {
  id: number;
  room_code: string;
  status: string;
  max_players: number;
  created_by: number;
  // Only present on the user's rooms list (`rooms/user/{id}/`), not on
  // other endpoints that reuse this shape (e.g. join room).
  is_host?: boolean;
  member_count?: number;
}

export interface JoinRoomResponse {
  message?: string;
  room: RoomSummary;
}

export interface UserRoomsResponse {
  rooms: RoomSummary[];
}

export interface LeaveRoomResponse {
  message?: string;
}

export interface RoomPlayer {
  id: number;
  is_host: boolean;
  is_ready: boolean;
  joined_at: string;
  score: number;
  player: {
    id: number;
    name: string;
    email: string;
    dp: string | null;
  };
}

export interface RoomDetails {
  id: number;
  created_by: number;
  max_players: number;
  room_code: string;
  status: string;
  room_players: RoomPlayer[];
}

class Room {
  createRoom = async () => {
    const accountId = await CrossPlatformStorage.getItem("accountId");
    return api.post<CreateRoomResponse>(`rooms/userid/${accountId}`, {});
  };

  getRoomDetails = async (roomId: string) => {
    return api.get<RoomDetails>(`rooms/${roomId}`);
  };

  getUserRooms = async (accountId: string) => {
    return api.get<UserRoomsResponse>(`rooms/user/${accountId}/`);
  };

  joinRoom = async (roomCode: string) => {
    const accountId = await CrossPlatformStorage.getItem("accountId");
    return api.post<JoinRoomResponse>("rooms/join", {
      room_code: roomCode,
      user_id: accountId ? Number(accountId) : null,
    });
  };

  leaveRoom = async (roomId: string) => {
    const accountId = await CrossPlatformStorage.getItem("accountId");
    return api.post<LeaveRoomResponse>("rooms/leave", {
      room_id: Number(roomId),
      user_id: accountId ? Number(accountId) : null,
    });
  };
}

export const ROOM = new Room();
