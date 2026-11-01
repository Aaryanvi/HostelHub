import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Tag,
  Search,
  MessageCircle,
  ArrowRight,
  BookOpen,
  RefreshCw,
} from "lucide-react";

import { getProducts, getCategories } from "../services/productService";
import ProductCard from "../components/ProductCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import useWishlistToggle from "../hooks/useWishlistToggle";
import "./Home.css";

const HOW_IT_WORKS = [
  {
    title: "Discover",
    text: "Browse listings from students across your campus — textbooks, electronics, furniture, and more.",
    icon: Search,
  },
  {
    title: "Connect",
    text: "See seller details and reach out directly to ask questions or arrange a meetup.",
    icon: MessageCircle,
  },
  {
    title: "Exchange",
    text: "Buy or sell on your own terms, right on campus. No shipping, no middleman.",
    icon: RefreshCw,
  },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const { isSaved, isPending, toggleSave, setSavedIds } =
    useWishlistToggle();

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      try {
        const [productData, categoryData] = await Promise.all([
          getProducts({ sort: "newest", limit: 4 }),
          getCategories(),
        ]);

        if (!active) return;

        setProducts(productData.products);
        setSavedIds(
          productData.products
            .filter((p) => p.is_saved)
            .map((p) => p.id)
        );
        setCategories(categoryData);
      } catch (err) {
        // The homepage can still work if listings fail to load.
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [setSavedIds]);

  return (
    <div className="home">
      {/* HERO SECTION */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-badge">
            <ShoppingCart size={15} />
            <span>Your campus, your community</span>
          </div>

          <h1>Your Campus. Your Marketplace.</h1>

          <p className="hero-sub">
            Buy, sell, and exchange useful items with students in your
            own hostel and college — textbooks, electronics, furniture,
            and everything in between.
          </p>

          <div className="hero-actions">
            <Link to="/marketplace" className="btn btn-primary">
              <ShoppingCart size={18} />
              Explore Marketplace
              <ArrowRight size={17} />
            </Link>

            <Link to="/add-product" className="btn btn-secondary">
              <Tag size={18} />
              Sell an Item
            </Link>
          </div>

          <div className="hero-highlights">
            <span>
              <BookOpen size={15} />
              Books & study materials
            </span>
            <span>
              <RefreshCw size={15} />
              Easy campus exchanges
            </span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">How HostelHub works</h2>

          <div className="how-grid">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon;

              return (
                <div className="how-card" key={step.title}>
                  <div className="how-icon">
                    <Icon size={25} strokeWidth={1.8} />
                  </div>

                  <span className="how-number">{i + 1}</span>

                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* POPULAR CATEGORIES */}
      {categories.length > 0 && (
        <section className="section section-muted">
          <div className="container">
            <h2 className="section-title">Popular categories</h2>

            <div className="category-grid">
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category}
                  to={`/marketplace?category=${encodeURIComponent(category)}`}
                  className="category-chip"
                >
                  <Tag size={15} />
                  {category}
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* RECENT LISTINGS */}
      <section className="section">
        <div className="container">
          <div className="section-header-row">
            <h2 className="section-title">
              <ShoppingCart size={23} />
              Recent listings
            </h2>

            <Link to="/marketplace" className="section-link">
              View all
              <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <LoadingSkeleton count={4} />
          ) : products.length === 0 ? (
            <p className="section-empty-note">
              No listings yet — be the first to sell something.
            </p>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSaved={isSaved(product.id)}
                  savePending={isPending(product.id)}
                  onToggleSave={toggleSave}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SELL CTA */}
      <section className="section sell-cta">
        <div className="container sell-cta-inner">
          <div className="sell-cta-icon">
            <Tag size={30} />
          </div>

          <div>
            <h2>Have something to sell?</h2>
            <p>
              List it in minutes and reach students right on your campus.
            </p>
          </div>

          <Link to="/add-product" className="btn btn-primary">
            <Tag size={18} />
            List an Item
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}