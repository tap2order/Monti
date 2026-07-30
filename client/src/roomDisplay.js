import { createContext, useContext } from "react";

export const RoomDisplayContext = createContext(null);

export function useRoomDisplayName() {
  const room = useContext(RoomDisplayContext);
  return String(room?.displayName || "").trim();
}
