"use client";

import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import ContentCard from "../../components/ContentCard";
import { analyticsAPI } from "../../services/api";
import { Eye, Heart, FileText, Users, TrendingUp } from "lucide-react";
import Spinner from '../../components/Spinner';

/**
 * Surfaces the analytics endpoints that existed in the backend from the start
 * but had no UI: /dashboard, /leaderboard, /categories and /trending.
 */
const Stat = ({ icon: Icon, label, value }) => (
  <div className="card flex items-center gap-4">
    <div className="w-11 h-11 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
      <Icon className="h-5 w-5 text-primary-600" />
    </div>
    <div className="min-w-0">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-bold text-ink">{value ?? "-"}</p>
    </div>
  </div>
);

export default function DashboardPage() {
  const [data, setData] = useState({ dashboard: null, leaderboard: [], categories: [], trending: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dash, board, cats, trend] = await Promise.all([
          analyticsAPI.getDashboard(),
          analyticsAPI.getLeaderboard({ limit: 10 }),
          analyticsAPI.getCategoryAnalytics(),
          analyticsAPI.getTrending({ limit: 6 }),
        ]);
        if (cancelled) return;
        setData({
          dashboard: dash && dash.data,
          leaderboard: (board && board.data) || [],
          categories: (cats && cats.data) || [],
          trending: (trend && trend.data) || [],
        });
      } catch (err) {
        if (!cancelled) setError("Could not load the dashboard. Is the API running?");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </Layout>
    );
  }

  const totals = (data.categories || []).reduce(
    (acc, c) => ({
      contents: acc.contents + Number(c.content_count || 0),
      views: acc.views + Number(c.total_views || 0),
      likes: acc.likes + Number(c.total_likes || 0),
    }),
    { contents: 0, views: 0, likes: 0 }
  );

  return (
    <Layout>
      <h1 className="mb-1">Dashboard</h1>
      <p className="text-muted mb-6">Aggregated from materialized views and window functions.</p>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat icon={FileText} label="Published content" value={totals.contents} />
        <Stat icon={Eye} label="Total views" value={totals.views} />
        <Stat icon={Heart} label="Total likes" value={totals.likes} />
        <Stat icon={Users} label="Ranked authors" value={data.leaderboard.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="mb-4">Top authors</h2>
          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted border-b border-edge">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">Author</th>
                  <th className="text-right px-4 py-3 font-medium">Content</th>
                  <th className="text-right px-4 py-3 font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((u, i) => (
                  <tr key={u.id} className="border-b border-edge last:border-0">
                    <td className="px-4 py-3 text-muted">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-ink">{u.username}</td>
                    <td className="px-4 py-3 text-right">{u.content_count}</td>
                    <td className="px-4 py-3 text-right">{u.total_views}</td>
                  </tr>
                ))}
                {data.leaderboard.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No ranked authors yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-4">Categories</h2>
          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted border-b border-edge">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-right px-4 py-3 font-medium">Content</th>
                  <th className="text-right px-4 py-3 font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((c) => (
                  <tr key={c.id || c.category_id || c.name} className="border-b border-edge last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{c.name || c.category_name}</td>
                    <td className="px-4 py-3 text-right">{c.content_count}</td>
                    <td className="px-4 py-3 text-right">{c.total_views}</td>
                  </tr>
                ))}
                {data.categories.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-muted">No category data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary-600" /> Trending now</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.trending.map((c) => <ContentCard key={c.id} content={c} showTrend />)}
        </div>
        {data.trending.length === 0 && <p className="text-muted">Nothing trending yet.</p>}
      </section>
    </Layout>
  );
}
