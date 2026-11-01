import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getWishlist } from "../services/wishlistService";
import ProductCard from "../components/ProductCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import EmptyState from "../components/EmptyState";
import useWishlistToggle from "../hooks/useWishlistToggle";
import "./SavedItems.css";

export default function SavedItems() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { isSaved, isPending, toggleSave, setSavedIds } = useWishlistToggle();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getWishlist();
        if (!active) return;
        setProducts(data);
        setSavedIds(data.map((p) => p.id));
      } catch (err) {
        if (active) setError(err.message || "Unable to load your saved items.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [setSavedIds]);

  // Every item on this page starts saved, so toggling it here always means
  // unsaving — remove it from the local list once the request succeeds.
  async function handleToggle(productId) {
    await toggleSave(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  return (
    <div className="container saved-page">
      <div className="saved-header">
        <h1>Saved Items</h1>
        <p>Items you've saved for later.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <LoadingSkeleton count={6} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No saved items yet"
          message="Save items you're interested in to find them here later."
          actionLabel="Browse Marketplace"
          onAction={() => { window.location.href = "/marketplace"; }}
        />
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              isSaved={isSaved(p.id)}
              savePending={isPending(p.id)}
              onToggleSave={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
