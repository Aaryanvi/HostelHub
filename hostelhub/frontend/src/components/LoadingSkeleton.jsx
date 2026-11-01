import "./LoadingSkeleton.css";

export default function LoadingSkeleton({ count = 6 }) {
  return (
    <div className="skeleton-grid" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card card">
          <div className="skeleton" style={{ aspectRatio: "4 / 3" }} />
          <div className="skeleton-card-body">
            <div className="skeleton" style={{ width: "40%", height: 10 }} />
            <div className="skeleton" style={{ width: "80%", height: 14 }} />
            <div className="skeleton" style={{ width: "60%", height: 14 }} />
            <div className="skeleton" style={{ width: "100%", height: 32, marginTop: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
