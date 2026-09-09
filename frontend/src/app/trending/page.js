"use client";

import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import ContentCard from "../../components/ContentCard";
import { analyticsAPI } from "../../services/api";
import Spinner from '../../components/Spinner';

const WINDOWS = [
  { label: "24 hours", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
];

export default function TrendingPage() {
  const [days, setDays] = useState(7);
  const [items, setItems] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [trend, top] = await Promise.all([
          analyticsAPI.getTrending({ days, limit: 12 }),
          analyticsAPI.getTopByCategory({ limit: 3 }),
        ]);
        if (cancelled) return;
        setItems((trend && trend.data) || []);
        setByCategory((top && top.data) || []);
        setError("");
      } catch (err) {
        if (!cancelled) setError("Could not load trending content.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [days]);

  return (
    <Layout>
      <h1 className="mb-1">Trending</h1>
      <p className="text-muted mb-6">Ranked by a materialized view comparing recent activity against the prior window.</p>

      <div className="flex gap-2 mb-8">
        {WINDOWS.map((w) => (
          <button
            key={w.days}
            onClick={() => setDays(w.days)}
            className={
              "px-4 py-2 rounded-lg font-medium transition-colors " +
              (days === w.days ? "bg-primary-600 text-white" : "text-muted hover:bg-canvas border border-edge")
            }
          >
            {w.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {items.map((c) => <ContentCard key={c.id} content={c} showTrend />)}
          </div>
          {items.length === 0 && <p className="text-muted mb-12">Nothing trending in this window.</p>}

          <h2 className="mb-4">Top per category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {byCategory.map((c) => <ContentCard key={c.id} content={c} />)}
          </div>
          {byCategory.length === 0 && <p className="text-muted">No category rankings yet.</p>}
        </>
      )}
    </Layout>
  );
}
