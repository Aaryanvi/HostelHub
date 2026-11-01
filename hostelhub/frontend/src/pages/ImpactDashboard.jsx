import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Leaf,
  Package,
  Recycle,
  ShoppingBag,
  Store,
} from "lucide-react";

import { getImpactStats } from "../services/productService";
import "./ImpactDashboard.css";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}) {
  return (
    <article className={`impact-metric impact-${tone}`}>
      <div className="impact-metric-top">
        <span className="impact-icon">
          <Icon size={23} />
        </span>
        <span className="impact-metric-label">{title}</span>
      </div>

      <div className="impact-metric-value">{value}</div>
      <p className="impact-metric-description">{description}</p>
    </article>
  );
}

export default function ImpactDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStats() {
      try {
        setLoading(true);
        setError("");

        const result = await getImpactStats();

        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.error ||
              "Unable to load sustainability statistics. Please try again."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="impact-page">
        <div className="impact-container">
          <div className="impact-loading">
            <Recycle size={34} />
            <h2>Loading campus impact...</h2>
            <p>Gathering the latest marketplace statistics.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="impact-page">
        <div className="impact-container">
          <div className="impact-error">
            <Activity size={30} />
            <h2>Dashboard unavailable</h2>
            <p>{error}</p>
            <button
              className="impact-retry"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const categories = data?.categories || [];

  return (
    <div className="impact-page">
      <div className="impact-container">
        {/* Hero */}
        <section className="impact-hero">
          <div className="impact-hero-content">
            <div className="impact-eyebrow">
              <Leaf size={16} />
              HOSTELHUB SUSTAINABILITY
            </div>

            <h1>Small actions. Big impact.</h1>

            <p>
              Every item that finds a new home is an opportunity to
              save money, reduce waste, and build a greener campus.
            </p>

            <div className="impact-hero-badge">
              <Recycle size={17} />
              Reuse more. Waste less.
            </div>
          </div>

          <div className="impact-hero-art" aria-hidden="true">
            <div className="impact-planet">
              <Leaf size={66} />
            </div>
            <span className="impact-orbit impact-orbit-one" />
            <span className="impact-orbit impact-orbit-two" />
            <span className="impact-floating impact-floating-one">
              ♻
            </span>
            <span className="impact-floating impact-floating-two">
              +
            </span>
          </div>
        </section>

        {/* Overview */}
        <section className="impact-section">
          <div className="impact-section-heading">
            <div>
              <span className="impact-kicker">YOUR COMMUNITY</span>
              <h2>Marketplace overview</h2>
              <p>Statistics calculated from your current listings.</p>
            </div>

            <span className="impact-live-badge">
              <span />
              Live data
            </span>
          </div>

          <div className="impact-metrics-grid">
            <MetricCard
              title="Total listings"
              value={stats.total_listings ?? 0}
              description="Items listed on HostelHub"
              icon={Package}
              tone="green"
            />

            <MetricCard
              title="Available items"
              value={stats.available_listings ?? 0}
              description="Items currently available"
              icon={Store}
              tone="blue"
            />

            <MetricCard
              title="Marked as sold"
              value={stats.sold_listings ?? 0}
              description="Listings with sold status"
              icon={CheckCircle2}
              tone="pink"
            />

            <MetricCard
              title="Available value"
              value={formatCurrency(stats.available_listed_value)}
              description="Combined prices of available items"
              icon={CircleDollarSign}
              tone="orange"
            />
          </div>
        </section>

        {/* Resale value */}
        <section className="impact-value-panel">
          <div className="impact-value-icon">
            <ShoppingBag size={28} />
          </div>

          <div className="impact-value-copy">
            <span>VALUE OF LISTINGS MARKED SOLD</span>
            <h2>{formatCurrency(stats.sold_listing_value)}</h2>
            <p>
              Sum of the original listing prices for items marked sold.
              This is not verified revenue or confirmed seller proceeds.
            </p>
          </div>

          <div className="impact-value-decoration" aria-hidden="true">
            <ArrowUpRight size={76} />
          </div>
        </section>

        {/* Categories */}
        <section className="impact-section">
          <div className="impact-section-heading">
            <div>
              <span className="impact-kicker">WHAT STUDENTS SHARE</span>
              <h2>Popular item categories</h2>
              <p>See how listings are distributed across categories.</p>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="impact-empty">
              <Package size={32} />
              <h3>No listings yet</h3>
              <p>Category statistics will appear when students list items.</p>
            </div>
          ) : (
            <div className="impact-category-panel">
              {categories.map((category, index) => {
                const total = stats.total_listings || 0;
                const percentage =
                  total > 0
                    ? Math.round((category.count / total) * 100)
                    : 0;

                return (
                  <div className="impact-category-row" key={category.name}>
                    <div className="impact-category-top">
                      <span className="impact-category-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="impact-category-name">
                        {category.name}
                      </span>

                      <span className="impact-category-count">
                        {category.count}
                      </span>
                    </div>

                    <div
                      className="impact-progress-track"
                      role="progressbar"
                      aria-label={`${category.name} share of all listings`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                    >
                      <div
                        className="impact-progress-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <span className="impact-category-percent">
                      {percentage}% of all listings
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Environmental impact */}
        <section className="impact-green-panel">
          <div className="impact-green-icon">
            <Leaf size={30} />
          </div>

          <div>
            <span className="impact-kicker">OUR NEXT MILESTONE</span>
            <h2>Measure reuse. Grow our impact.</h2>

            <p>
              HostelHub currently records listing status, but it does not
              yet track confirmed exchanges, giveaways, item weights, or
              avoided purchases. Those measurements can be added to make
              the environmental dashboard more meaningful.
            </p>

            <div className="impact-coming-soon">
              <ArrowDownRight size={17} />
              Verified reuse and waste-reduction metrics coming next
            </div>
          </div>
        </section>

        <p className="impact-disclaimer">
          {data?.impact_note ||
            "Statistics reflect marketplace listing records. Environmental impact is not yet measured."}
        </p>
      </div>
    </div>
  );
}