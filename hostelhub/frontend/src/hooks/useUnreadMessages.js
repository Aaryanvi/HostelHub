import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getUnreadCount } from "../services/messageService";

export const MESSAGES_CHANGED_EVENT = "hostelhub:messages-changed";

/** Polls the unread-message count (every 20s, and whenever the inbox says it changed). */
export default function useUnreadMessages() {
  const { isAuthenticated } = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setUnread(0);
      return;
    }
    try {
      setUnread(await getUnreadCount());
    } catch (err) {
      // Not critical — the badge just won't update.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
    if (!isAuthenticated) return undefined;
    const timer = setInterval(refresh, 20000);
    window.addEventListener(MESSAGES_CHANGED_EVENT, refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener(MESSAGES_CHANGED_EVENT, refresh);
    };
  }, [refresh, isAuthenticated]);

  return unread;
}
