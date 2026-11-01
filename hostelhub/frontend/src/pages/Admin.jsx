import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getReports, resolveReport, removeListing } from "../services/moderationService";
import EmptyState from "../components/EmptyState";
import "./Admin.css";

export default function Admin() {
  const { user } = useAuth();
  const toast = useToast();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!user?.is_admin) return;
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getReports("open");
        if (active) setReports(data);
      } catch (err) {
        if (active) setError(err.message || "Unable to load reports.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [user]);

  if (!user?.is_admin) {
    return (
      <div className="container admin-page">
        <EmptyState title="Admin access required" message="Your account doesn't have moderator permissions." />
      </div>
    );
  }

  async function handleDismiss(report) {
    setBusyId(report.id);
    try {
      await resolveReport(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast.success("Report dismissed.");
    } catch (err) {
      toast.error(err.message || "Unable to dismiss this report.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(report) {
    if (!window.confirm(`Remove "${report.product.title}"? This deletes the listing for everyone.`)) return;
    setBusyId(report.id);
    try {
      await removeListing(report.product.id);
      // Removing a listing also deletes every report about it.
      setReports((prev) => prev.filter((r) => r.product.id !== report.product.id));
      toast.success("Listing removed.");
    } catch (err) {
      toast.error(err.message || "Unable to remove this listing.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container admin-page">
      <h1>Moderation</h1>
      <p className="admin-sub">Open reports from students. Dismiss a report, or remove the listing.</p>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="skeleton" style={{ height: 160 }} />
      ) : reports.length === 0 ? (
        <EmptyState title="No open reports" message="Nothing needs your attention right now." />
      ) : (
        <div className="admin-list">
          {reports.map((r) => (
            <div key={r.id} className="admin-report card">
              <div className="admin-report-main">
                <Link to={`/product/${r.product.id}`} className="admin-report-title">{r.product.title}</Link>
                <p className="admin-report-meta">
                  Seller: {r.product.seller || "Unknown"} · Reported by {r.reporter.name}
                </p>
                <p><span className="badge badge-danger">{r.reason}</span></p>
                {r.details && <p className="admin-report-details">{r.details}</p>}
              </div>
              <div className="admin-report-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => handleDismiss(r)} disabled={busyId === r.id}>
                  Dismiss
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleRemove(r)} disabled={busyId === r.id}>
                  Remove Listing
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
