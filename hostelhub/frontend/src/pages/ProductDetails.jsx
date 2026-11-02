import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getProduct,
  markProductSold,
  relistProduct
} from "../services/productService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useWishlistToggle from "../hooks/useWishlistToggle";
import ContactSellerBox from "../components/ContactSellerBox";
import ReportBox from "../components/ReportBox";
import api from "../services/api";
import "./ProductDetails.css";

function timeAgo(dateStr) {
  if (!dateStr) return "";

  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Listed today";
  if (days === 1) return "Listed 1 day ago";

  return `Listed ${days} days ago`;
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingSold, setTogglingSold] = useState(false);

  // Report states
  const [hasReported, setHasReported] = useState(false);
  const [checkingReport, setCheckingReport] = useState(false);
  const [withdrawingReport, setWithdrawingReport] = useState(false);

  const {
    isSaved,
    isPending,
    toggleSave,
    setSavedIds
  } = useWishlistToggle();

  // Load product details
  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await getProduct(id);

        if (!active) return;

        setProduct(data);

        if (data.is_saved) {
          setSavedIds([data.id]);
        }
      } catch (err) {
        if (!active) return;

        setError(
          err.status === 404
            ? "Product not found."
            : err.message || "Unable to load this listing."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id, setSavedIds]);

  // Check whether the logged-in user has reported this product
  useEffect(() => {
    let active = true;

    async function checkReportStatus() {
      setHasReported(false);

      if (!user) return;

      setCheckingReport(true);

      try {
        const response = await api.get(
          `/moderation/report/${id}/mine`
        );

        if (active) {
          setHasReported(response.data.reported);
        }
      } catch (err) {
        console.error("Unable to check report status:", err);
      } finally {
        if (active) {
          setCheckingReport(false);
        }
      }
    }

    checkReportStatus();

    return () => {
      active = false;
    };
  }, [id, user]);

  async function handleWithdrawReport() {
    const confirmed = window.confirm(
      "Are you sure you want to withdraw your report against this listing?"
    );

    if (!confirmed) return;

    setWithdrawingReport(true);

    try {
      const response = await api.delete(
        `/moderation/report/${id}`
      );

      setHasReported(false);

      toast.success(
        response.data.message || "Your report has been withdrawn."
      );
    } catch (err) {
      toast.error(
        err.message || "Unable to withdraw your report."
      );
    } finally {
      setWithdrawingReport(false);
    }
  }

  if (loading) {
    return (
      <div className="container product-details-page">
        <div
          className="skeleton"
          style={{
            height: 380,
            borderRadius: "var(--radius)"
          }}
        />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container product-details-page">
        <div className="empty-state">
          <h3>{error || "Product not found."}</h3>

          <Link
            to="/marketplace"
            className="btn btn-secondary btn-sm"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const isOwnListing =
    user && product.seller_id === user.id;

  const isSold = product.status === "sold";

  async function handleToggleSold() {
    setTogglingSold(true);

    try {
      const updated = isSold
        ? await relistProduct(product.id)
        : await markProductSold(product.id);

      setProduct(updated);

      toast.success(
        updated.status === "sold"
          ? "Marked as sold."
          : "Relisted as available."
      );
    } catch (err) {
      toast.error(
        err.message || "Unable to update this listing."
      );
    } finally {
      setTogglingSold(false);
    }
  }

  return (
    <div className="container product-details-page">
      <div className="product-details-grid">

        <div className="product-details-image-wrap">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
            />
          ) : (
            <div className="product-details-image-placeholder">
              {product.category?.charAt(0) || "H"}
            </div>
          )}
        </div>

        <div className="product-details-info">

          <span className="product-card-category">
            {product.category}
          </span>

          <h1>{product.title}</h1>

          <div className="product-details-price-row">
            <span className="product-details-price">
              ₹{product.price}
            </span>

            <span className="badge badge-neutral">
              {product.condition}
            </span>

            {isSold && (
              <span className="badge badge-danger">
                Sold
              </span>
            )}
          </div>

          <p className="product-details-desc">
            {product.description || "No description provided."}
          </p>

          <p className="product-details-time">
            {timeAgo(product.created_at)}
          </p>

          <div className="seller-card card">
            <p className="seller-card-label">
              Listed by
            </p>

            <p className="seller-card-name">
              {product.seller?.name}
            </p>

            {(product.seller?.hostel || product.seller?.branch) && (
              <p className="seller-card-meta">
                {[
                  product.seller?.hostel,
                  product.seller?.branch,
                  product.seller?.year
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            )}
          </div>

          {!isOwnListing && (
            <>
              {isSold && (
                <p className="product-details-sold-note">
                  This item has been sold.
                </p>
              )}

              <div className="product-details-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => toggleSave(product.id)}
                  disabled={isPending(product.id)}
                >
                  {isSaved(product.id)
                    ? "♥ Saved"
                    : "♡ Save Item"}
                </button>

                {!isSold && (
                  <ContactSellerBox product={product} />
                )}
              </div>

              <div className="product-details-report">

                {user && hasReported ? (
                  <div className="report-withdraw-box">
                    <p>
                      ✓ You have reported this listing.
                    </p>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleWithdrawReport}
                      disabled={withdrawingReport}
                    >
                      {withdrawingReport
                        ? "Withdrawing..."
                        : "Unreport Listing"}
                    </button>
                  </div>
                ) : (
                  !checkingReport && (
                    <ReportBox productId={product.id} />
                  )
                )}

              </div>
            </>
          )}

          {isOwnListing && (
            <div className="product-details-actions">
              <button
                className="btn btn-secondary"
                onClick={() =>
                  navigate(`/edit-product/${product.id}`)
                }
              >
                Edit Listing
              </button>

              <button
                className="btn btn-secondary"
                onClick={handleToggleSold}
                disabled={togglingSold}
              >
                {togglingSold
                  ? "Updating..."
                  : isSold
                    ? "Relist as Available"
                    : "Mark as Sold"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}