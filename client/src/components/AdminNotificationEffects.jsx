import { useEffect } from "react";
import { io } from "socket.io-client";
import { useLocation } from "react-router-dom";
import { getAdminToken, isAdminLoggedIn } from "../adminAuth";
import {
  announceAdminNotification,
  clearAdminNotificationAlert,
  unlockAdminNotificationSound,
} from "../adminNotificationAlert";

export default function AdminNotificationEffects() {
  const api = import.meta.env.VITE_API_URL || "";
  const location = useLocation();

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      clearAdminNotificationAlert();
      return undefined;
    }

    const token = getAdminToken();
    const socket = io(api, { transports: ["websocket"], auth: { token } });
    const onOrder = (order) => announceAdminNotification({ id: `order-${order.id}`, type: "order" });
    const onCall = (call) => announceAdminNotification({ id: `call-${call.id}`, type: "call" });
    const onServiceWorkerMessage = (event) => {
      if (event.data?.type !== "admin-notification") return;
      announceAdminNotification(event.data.notification);
    };
    const onVisibilityChange = () => {
      if (!document.hidden) clearAdminNotificationAlert();
    };
    const onFirstInteraction = () => unlockAdminNotificationSound();

    socket.on("order:new", onOrder);
    socket.on("call:new", onCall);
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pointerdown", onFirstInteraction, { once: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });

    return () => {
      socket.disconnect();
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, [api, location.pathname]);

  return null;
}
