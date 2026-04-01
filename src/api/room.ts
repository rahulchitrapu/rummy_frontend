import api from "@/services/api";
import { CrossPlatformStorage } from "@/utils/storage";

class Room {
  createRoom = async () => {
    const accountId = await CrossPlatformStorage.getItem("accountId");
    return api.post(`rooms/userid/${accountId}`, {});
  };
}

export const ROOM = new Room();
