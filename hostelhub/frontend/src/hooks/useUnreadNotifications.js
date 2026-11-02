import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getUnreadNotificationCount } from "../services/notificationService";

export const NOTIFICATIONS_CHANGED_EVENT =
  "hostelhub:notifications-changed";

export default function useUnreadNotifications() {
  const { isAuthenticated } = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setUnread(0);
      return;
    }

    try {
      setUnread(await getUnreadNotificationCount());
    } catch (err) {
      // Badge will update on the next refresh.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();

    if (!isAuthenticated) return undefined;

    const timer = setInterval(refresh, 20000);

    window.addEventListener(
      NOTIFICATIONS_CHANGED_EVENT,
      refresh
    );

    return () => {
      clearInterval(timer);

      window.removeEventListener(
        NOTIFICATIONS_CHANGED_EVENT,
        refresh
      );
    };
  }, [refresh, isAuthenticated]);

  return unread;
}