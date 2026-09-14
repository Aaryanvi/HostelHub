function ProductCard({ product }) {
  return (
    <div className="product-card">
      <h3>{product.title}</h3>

      <p>{product.description}</p>

      <p>
        <strong>₹{product.price}</strong>
      </p>

      <p>Category: {product.category}</p>

      <p>Condition: {product.condition}</p>

      <button>
        View Details
      </button>
    </div>
  );
}

export default ProductCard;