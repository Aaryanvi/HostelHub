import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Inbox,
  RefreshCw
} from "lucide-react";

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from "../services/notificationService";

import {
  NOTIFICATIONS_CHANGED_EVENT
} from "../hooks/useUnreadNotifications";

import "./Notifications.css";

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setError("");

      const data = await getNotifications();

      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      setError(
        err.message || "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkRead(id) {
    try {
      await markNotificationAsRead(id);

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );

      setUnreadCount((previous) =>
        Math.max(0, previous - 1)
      );

      window.dispatchEvent(
        new Event(NOTIFICATIONS_CHANGED_EVENT)
      );
    } catch (err) {
      setError(err.message || "Unable to update notification.");
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;

    try {
      setUpdating(true);

      await markAllNotificationsAsRead();

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true
        }))
      );

      setUnreadCount(0);

      window.dispatchEvent(
        new Event(NOTIFICATIONS_CHANGED_EVENT)
      );
    } catch (err) {
      setError(err.message || "Unable to update notifications.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="notifications-page">
      <div className="notifications-container">

        {/* HEADER */}
        <div className="notifications-header">
          <div className="notifications-heading">
            <div className="notifications-heading-icon">
              <Bell size={25} />
            </div>

            <div>
              <h1>Notifications</h1>
              <p>
                Stay updated with your HostelHub activity.
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              className="mark-all-btn"
              onClick={handleMarkAllRead}
              disabled={updating}
            >
              <CheckCheck size={17} />
              {updating ? "Updating..." : "Mark all as read"}
            </button>
          )}
        </div>

        {/* SUMMARY */}
        <div className="notification-summary">
          <div>
            <span className="summary-number">
              {notifications.length}
            </span>
            <span className="summary-label">
              Total notifications
            </span>
          </div>

          <div>
            <span className="summary-number unread-number">
              {unreadCount}
            </span>
            <span className="summary-label">
              Unread
            </span>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="notification-error">
            {error}
            <button onClick={fetchNotifications}>
              Try again
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="notification-loading">
            <RefreshCw size={25} className="loading-icon" />
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (

          /* EMPTY STATE */
          <div className="notification-empty">
            <div className="empty-icon">
              <Inbox size={38} />
            </div>

            <h2>You're all caught up!</h2>

            <p>
              You don't have any notifications yet.
              We'll let you know when something happens.
            </p>
          </div>

        ) : (

          /* NOTIFICATION LIST */
          <div className="notification-list">

            {notifications.map((notification) => (

              <div
                key={notification.id}
                className={`notification-card ${
                  notification.is_read ? "is-read" : "is-unread"
                }`}
              >

                <div className="notification-card-icon">
                  <Bell size={21} />
                </div>

                <div className="notification-content">

                  <div className="notification-title-row">
                    <h3>{notification.title}</h3>

                    {!notification.is_read && (
                      <span className="unread-dot"></span>
                    )}
                  </div>

                  <p>{notification.message}</p>

                  <span className="notification-date">
                    {formatDate(notification.created_at)}
                  </span>

                </div>

                {!notification.is_read && (
                  <button
                    className="mark-read-btn"
                    onClick={() =>
                      handleMarkRead(notification.id)
                    }
                    title="Mark as read"
                    aria-label="Mark notification as read"
                  >
                    <Check size={18} />
                  </button>
                )}

              </div>

            ))}

          </div>
        )}

      </div>
    </div>
  );
}