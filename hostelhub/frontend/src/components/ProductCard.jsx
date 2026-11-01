import { Link } from "react-router-dom";
import "./ProductCard.css";

export default function ProductCard({ product, isSaved, onToggleSave, savePending }) {
  const { id, title, price, category, condition, image, description } = product;

  return (
    <div className="product-card card">
      <Link to={`/product/${id}`} className="product-card-image-wrap">
        {image ? (
          <img src={image} alt={title} className="product-card-image" />
        ) : (
          <div className="product-card-image-placeholder" aria-hidden="true">
            {category?.charAt(0) || "H"}
          </div>
        )}
      </Link>

      {onToggleSave && (
        <button
          type="button"
          className={`product-card-save ${isSaved ? "is-saved" : ""}`}
          onClick={() => onToggleSave(id)}
          disabled={savePending}
          aria-pressed={isSaved}
          aria-label={isSaved ? "Remove from saved items" : "Save item"}
        >
          {isSaved ? "♥" : "♡"}
        </button>
      )}

      <div className="product-card-body">
        <span className="product-card-category">{category}</span>
        <Link to={`/product/${id}`} className="product-card-title">
          {title}
        </Link>
        {description && <p className="product-card-desc">{description}</p>}

        <div className="product-card-footer">
          <span className="product-card-price">₹{price}</span>
          <span className="product-card-badges">
            <span className="badge badge-neutral">{condition}</span>
            {product.status === "sold" && <span className="badge badge-danger">Sold</span>}
          </span>
        </div>

        <Link to={`/product/${id}`} className="btn btn-secondary btn-sm btn-block product-card-cta">
          View Details
        </Link>
      </div>
    </div>
  );
}
