import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getConversations, getThread, sendMessage } from "../services/messageService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { MESSAGES_CHANGED_EVENT } from "../hooks/useUnreadMessages";
import "./Inbox.css";

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Inbox() {
  const { productId, userId } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  const [thread, setThread] = useState(null);
  const [threadError, setThreadError] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);
  const shownCount = useRef(0);

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await getConversations());
      setListError("");
    } catch (err) {
      setListError(err.message || "Unable to load your messages.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Conversation list refreshes every 10s.
  useEffect(() => {
    loadConversations();
    const timer = setInterval(loadConversations, 10000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  const loadThread = useCallback(async () => {
    if (!productId || !userId) return;
    try {
      const data = await getThread(productId, userId);
      setThread(data);
      setThreadError("");
      window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT)); // opening a thread marks it read
    } catch (err) {
      setThreadError(err.message || "Unable to load this conversation.");
    }
  }, [productId, userId]);

  // Open thread refreshes every 5s (simple polling, no WebSockets needed for an MVP).
  useEffect(() => {
    setThread(null);
    setThreadError("");
    shownCount.current = 0;
    if (!productId || !userId) return undefined;
    loadThread();
    const timer = setInterval(loadThread, 5000);
    return () => clearInterval(timer);
  }, [loadThread, productId, userId]);

  // Scroll to the newest message only when a new one arrives.
  useEffect(() => {
    const count = thread?.messages?.length || 0;
    if (count !== shownCount.current) {
      shownCount.current = count;
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [thread]);

  async function handleSend(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendMessage({ productId: Number(productId), body: text, receiverId: Number(userId) });
      setBody("");
      await loadThread();
      loadConversations();
    } catch (err) {
      toast.error(err.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  }

  const hasThread = Boolean(productId && userId);

  return (
    <div className="container inbox-page">
      <h1 className="inbox-title">Messages</h1>

      <div className={`inbox-layout card ${hasThread ? "has-thread" : ""}`}>
        <aside className="inbox-list" aria-label="Conversations">
          {listError && <div className="error-banner">{listError}</div>}
          {loadingList ? (
            <div className="inbox-list-loading">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8 }} />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="inbox-empty">
              <h3>No messages yet</h3>
              <p>When you contact a seller, or a buyer contacts you, the conversation shows up here.</p>
              <Link to="/marketplace" className="btn btn-secondary btn-sm">Browse Marketplace</Link>
            </div>
          ) : (
            conversations.map((c) => {
              const active = String(c.product.id) === productId && String(c.other_user.id) === userId;
              return (
                <Link
                  key={`${c.product.id}-${c.other_user.id}`}
                  to={`/inbox/${c.product.id}/${c.other_user.id}`}
                  className={`inbox-item ${active ? "active" : ""}`}
                >
                  <div className="inbox-item-top">
                    <span className="inbox-item-name">{c.other_user.name}</span>
                    {c.unread > 0 && <span className="navbar-badge">{c.unread}</span>}
                  </div>
                  <span className="inbox-item-product">{c.product.title}</span>
                  <span className="inbox-item-preview">
                    {c.last_message.from_me ? "You: " : ""}{c.last_message.body}
                  </span>
                </Link>
              );
            })
          )}
        </aside>

        <section className="inbox-thread" aria-label="Conversation">
          {!hasThread ? (
            <div className="inbox-empty inbox-empty-thread">
              <h3>Select a conversation</h3>
              <p>Pick a conversation on the left to read and reply.</p>
            </div>
          ) : threadError ? (
            <div className="inbox-empty">
              <h3>{threadError}</h3>
              <Link to="/inbox" className="btn btn-secondary btn-sm">Back to messages</Link>
            </div>
          ) : !thread ? (
            <div className="inbox-list-loading">
              <div className="skeleton" style={{ height: 300 }} />
            </div>
          ) : (
            <>
              <header className="inbox-thread-header">
                <Link to="/inbox" className="inbox-back">← All messages</Link>
                <div>
                  <p className="inbox-thread-name">{thread.other_user.name}</p>
                  <Link to={`/product/${thread.product.id}`} className="inbox-thread-product">
                    {thread.product.title} · ₹{thread.product.price}
                    {thread.product.status === "sold" ? " · Sold" : ""}
                  </Link>
                </div>
              </header>

              <div className="inbox-messages">
                {thread.messages.length === 0 ? (
                  <p className="inbox-no-messages">No messages in this conversation yet.</p>
                ) : (
                  thread.messages.map((m) => (
                    <div key={m.id} className={`bubble ${m.sender_id === user?.id ? "mine" : "theirs"}`}>
                      <p>{m.body}</p>
                      <span>{formatTime(m.created_at)}</span>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <form className="inbox-compose" onSubmit={handleSend}>
                <label htmlFor="reply" className="sr-only">Write a message</label>
                <textarea
                  id="reply"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a message..."
                  rows={2}
                  maxLength={1000}
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !body.trim()}>
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
