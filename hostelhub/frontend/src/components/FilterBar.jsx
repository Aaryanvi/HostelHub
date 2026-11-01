import "./FilterBar.css";

const CONDITIONS = ["All", "New", "Like New", "Good", "Fair", "Worn"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export default function FilterBar({ categories, filters, onChange, onClear }) {
  function update(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="filter-bar">
      <div className="field filter-field">
        <label htmlFor="category-filter">Category</label>
        <select
          id="category-filter"
          value={filters.category}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="All">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="field filter-field">
        <label htmlFor="condition-filter">Condition</label>
        <select
          id="condition-filter"
          value={filters.condition}
          onChange={(e) => update("condition", e.target.value)}
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="field filter-field">
        <label htmlFor="sort-filter">Sort</label>
        <select
          id="sort-filter"
          value={filters.sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <button type="button" className="btn btn-ghost btn-sm filter-clear" onClick={onClear}>
        Clear Filters
      </button>
    </div>
  );
}
