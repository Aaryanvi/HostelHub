import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getProducts, getCategories } from "../services/productService";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import FilterBar from "../components/FilterBar";
import LoadingSkeleton from "../components/LoadingSkeleton";
import EmptyState from "../components/EmptyState";
import useWishlistToggle from "../hooks/useWishlistToggle";
import "./Marketplace.css";

const DEFAULT_FILTERS = { category: "All", condition: "All", sort: "newest" };
const PER_PAGE = 12;

export default function Marketplace() {
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    category: searchParams.get("category") || "All",
  });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const { isSaved, isPending, toggleSave, setSavedIds, addSavedIds } = useWishlistToggle();

  // Loads the first page (replacing the list) whenever search/filters change.
  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProducts({ search, ...filters, page: 1, perPage: PER_PAGE });
      setProducts(data.products);
      setPage(1);
      setTotal(data.count);
      setHasMore(data.has_more);
      setSavedIds(data.products.filter((p) => p.is_saved).map((p) => p.id));
    } catch (err) {
      setError(err.message || "Unable to load listings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, filters, setSavedIds]);

  async function loadMore() {
    setLoadingMore(true);
    setError("");
    try {
      const nextPage = page + 1;
      const data = await getProducts({ search, ...filters, page: nextPage, perPage: PER_PAGE });
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.products.filter((p) => !seen.has(p.id))];
      });
      setPage(nextPage);
      setTotal(data.count);
      setHasMore(data.has_more);
      addSavedIds(data.products.filter((p) => p.is_saved).map((p) => p.id));
    } catch (err) {
      setError(err.message || "Unable to load more listings.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadFirstPage, 300); // debounce search typing
    return () => clearTimeout(timer);
  }, [loadFirstPage]);

  function clearFilters() {
    setSearch("");
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="marketplace container">
      <div className="marketplace-header">
        <h1>Campus Marketplace</h1>
        <p>Find useful items from students around your campus.</p>
      </div>

      <div className="marketplace-controls">
        <SearchBar value={search} onChange={setSearch} placeholder="Search books, calculators, cycles..." />
        <FilterBar
          categories={categories}
          filters={filters}
          onChange={setFilters}
          onClear={clearFilters}
        />
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <LoadingSkeleton count={8} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No listings found"
          message="Try changing your search or filters."
          actionLabel="Clear Filters"
          onAction={clearFilters}
        />
      ) : (
        <>
          <p className="marketplace-count" aria-live="polite">
            Showing {products.length} of {total} listing{total === 1 ? "" : "s"}
          </p>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isSaved={isSaved(p.id)}
                savePending={isPending(p.id)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
          {hasMore && (
            <div className="load-more">
              <button type="button" className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
