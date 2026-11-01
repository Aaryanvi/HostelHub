import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { sendMessage } from "../services/messageService";
import { MESSAGES_CHANGED_EVENT } from "../hooks/useUnreadMessages";

export default function ContactSellerBox({ product }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("Hi, is this still available?");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function handleOpen() {
    if (!isAuthenticated) {
      toast.error("Please log in to message the seller.");
      navigate("/login", { state: { from: location } });
      return;
    }
    setOpen(true);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await sendMessage({ productId: product.id, body: body.trim() });
      window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
      toast.success("Message sent.");
      navigate(`/inbox/${product.id}/${product.seller_id}`);
    } catch (err) {
      setError(err.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={handleOpen}>
        Contact Seller
      </button>
    );
  }

  return (
    <form className="side-form card" onSubmit={handleSend}>
      <label htmlFor="contact-body">Message to {product.seller?.name || "the seller"}</label>
      <textarea
        id="contact-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={3}
      />
      {error && <span className="field-error">{error}</span>}
      <div className="side-form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !body.trim()}>
          {sending ? "Sending..." : "Send Message"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={sending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
