import { createContext, useContext } from "react";

export const RoomDisplayContext = createContext(null);

export function useRoomNumber(fallbackId) {
  const room = useContext(RoomDisplayContext);
  const match = String(room?.displayName || "").match(/(\d+)\s*$/);
  return match ? match[1] : String(fallbackId || "");
}
