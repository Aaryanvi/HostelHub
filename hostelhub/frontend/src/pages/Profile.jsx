import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getMyProducts, deleteProduct, markProductSold, relistProduct } from "../services/productService";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import "./Profile.css";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "", phone: user?.phone || "", hostel: user?.hostel || "",
    branch: user?.branch || "", year: user?.year || "",
  });
  const [saving, setSaving] = useState(false);

  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingListings(true);
      setListingsError("");
      try {
        const data = await getMyProducts();
        if (active) setListings(data);
      } catch (err) {
        if (active) setListingsError(err.message || "Unable to load your listings.");
      } finally {
        if (active) setLoadingListings(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success("Profile updated.");
      setEditing(false);
    } catch (err) {
      toast.error(err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteListing(id) {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteProduct(id);
      setListings((prev) => prev.filter((p) => p.id !== id));
      toast.success("Listing deleted.");
    } catch (err) {
      toast.error(err.message || "Unable to delete this listing.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleSold(product) {
    setTogglingId(product.id);
    try {
      const updated = product.status === "sold"
        ? await relistProduct(product.id)
        : await markProductSold(product.id);
      setListings((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(updated.status === "sold" ? "Marked as sold." : "Relisted as available.");
    } catch (err) {
      toast.error(err.message || "Unable to update this listing.");
    } finally {
      setTogglingId(null);
    }
  }

  if (!user) return null;

  return (
    <div className="container profile-page">
      <div className="profile-header card">
        {!editing ? (
          <>
            <div className="profile-header-main">
              <div className="profile-avatar">{user.name?.charAt(0)}</div>
              <div>
                <h1>{user.name}</h1>
                <p className="profile-email">{user.email}</p>
                <p className="profile-meta">
                  {[user.hostel, user.branch, user.year].filter(Boolean).join(" • ") || "No hostel/branch details yet"}
                </p>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
              Edit Profile
            </button>
          </>
        ) : (
          <form onSubmit={handleSaveProfile} className="profile-edit-form">
            <div className="field-row">
              <div className="field">
                <label htmlFor="p-name">Name</label>
                <input id="p-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="p-phone">Phone</label>
                <input id="p-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="p-hostel">Hostel</label>
                <input id="p-hostel" value={form.hostel} onChange={(e) => setForm((f) => ({ ...f, hostel: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="p-branch">Branch</label>
                <input id="p-branch" value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="p-year">Year</label>
              <select id="p-year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}>
                <option value="">Select year</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="profile-edit-actions">
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="profile-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "overview"} className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
          Overview
        </button>
        <button role="tab" aria-selected={tab === "listings"} className={tab === "listings" ? "active" : ""} onClick={() => setTab("listings")}>
          My Listings
        </button>
        <Link to="/saved" className="profile-tab-link">Saved Items</Link>
      </div>

      {tab === "overview" && (
        <div className="profile-overview">
          <div className="overview-stat card">
            <span className="overview-stat-value">{listings.length}</span>
            <span className="overview-stat-label">Active Listings</span>
          </div>
        </div>
      )}

      {tab === "listings" && (
        <div className="profile-listings">
          {listingsError && <div className="error-banner">{listingsError}</div>}
          {loadingListings ? (
            <LoadingSkeleton count={3} />
          ) : listings.length === 0 ? (
            <EmptyState
              title="No listings yet"
              message="Items you list for sale will appear here."
              actionLabel="List an Item"
              onAction={() => { window.location.href = "/add-product"; }}
            />
          ) : (
            <div className="listing-table">
              {listings.map((p) => (
                <div key={p.id} className="listing-row card">
                  <div className="listing-row-image">
                    {p.image ? <img src={p.image} alt={p.title} /> : <div className="listing-row-placeholder">{p.category?.charAt(0)}</div>}
                  </div>
                  <div className="listing-row-info">
                    <Link to={`/product/${p.id}`} className="listing-row-title">{p.title}</Link>
                    <span className="listing-row-price">₹{p.price}</span>
                    <span className="badge badge-neutral">{p.condition}</span>
                    {p.status === "sold" && <span className="badge badge-danger">Sold</span>}
                  </div>
                  <div className="listing-row-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleToggleSold(p)}
                      disabled={togglingId === p.id}
                    >
                      {togglingId === p.id ? "Updating..." : p.status === "sold" ? "Relist" : "Mark as Sold"}
                    </button>
                    <Link to={`/edit-product/${p.id}`} className="btn btn-secondary btn-sm">Edit</Link>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteListing(p.id)}
                      disabled={deletingId === p.id}
                    >
                      {deletingId === p.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
