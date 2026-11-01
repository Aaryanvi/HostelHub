import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getReportReasons, reportListing } from "../services/moderationService";

export default function ReportBox({ productId }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && reasons.length === 0) {
      getReportReasons().then(setReasons).catch(() => {});
    }
  }, [open, reasons.length]);

  function handleOpen() {
    if (!isAuthenticated) {
      toast.error("Please log in to report a listing.");
      navigate("/login", { state: { from: location } });
      return;
    }
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason) {
      setError("Select a reason.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await reportListing(productId, reason, details);
      toast.success(res.message || "Report submitted.");
      setOpen(false);
      setReason("");
      setDetails("");
    } catch (err) {
      setError(err.message || "Unable to submit your report.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={handleOpen}>
        Report listing
      </button>
    );
  }

  return (
    <form className="side-form card" onSubmit={handleSubmit}>
      <label htmlFor="report-reason">Why are you reporting this listing?</label>
      <select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="">Select a reason</option>
        {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <label htmlFor="report-details">Details (optional)</label>
      <textarea
        id="report-details"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={1000}
        rows={3}
      />
      {error && <span className="field-error">{error}</span>}
      <div className="side-form-actions">
        <button type="submit" className="btn btn-danger btn-sm" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Report"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
