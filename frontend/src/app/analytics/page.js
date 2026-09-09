"use client";

import { useState, useEffect } from 'react';
import Layout from "../../components/Layout";
import ContentCard from '../../components/ContentCard';
import { analyticsAPI } from '../../services/api';
import { TrendingUp, Users, BarChart3, Search, Award } from 'lucide-react';
import Spinner from '../../components/Spinner';

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [dashboardData, leaderboardData] = await Promise.all([
        analyticsAPI.getDashboard(),
        analyticsAPI.getLeaderboard({ limit: 10 }),
      ]);

      setDashboard(dashboardData.data);
      setLeaderboard(leaderboardData.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-20">
          <Spinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <BarChart3 className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-ink">Analytics Dashboard</h1>
        </div>
        <p className="text-muted">
          Platform insights powered by PostgreSQL Window Functions & Materialized Views
        </p>
      </div>

      {/* Category Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-ink mb-4">Category Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboard?.categoryAnalytics?.slice(0, 4).map((category) => (
            <div key={category.id} className="bg-surface rounded-lg border border-edge p-6">
              <h3 className="font-semibold text-ink mb-2">{category.name}</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Contents</span>
                  <span className="font-medium text-ink">{category.content_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Views</span>
                  <span className="font-medium text-ink">
                    {category.total_views?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Authors</span>
                  <span className="font-medium text-ink">{category.unique_authors}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Content */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-bold text-ink">Trending This Week</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboard?.trending?.slice(0, 3).map((content) => (
            <ContentCard key={content.id} content={content} showTrend />
          ))}
        </div>
      </div>

      {/* Top Searches */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-bold text-ink">Popular Searches</h2>
        </div>
        <div className="bg-surface rounded-lg border border-edge overflow-hidden">
          <table className="min-w-full divide-y divide-edge">
            <thead className="bg-canvas">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Search Query
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Searches
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-edge">
              {dashboard?.searchAnalytics?.slice(0, 5).map((search, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-ink">{search.query}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        search.search_type === 'semantic'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-primary-100 text-primary-700'
                      }`}
                    >
                      {search.search_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                    {search.total_searches}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${
                        search.trend_percentage > 0 ? 'text-green-600' : 'text-muted'
                      }`}
                    >
                      {search.trend_percentage > 0 ? '+' : ''}
                      {search.trend_percentage?.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Award className="h-6 w-6 text-yellow-600" />
          <h2 className="text-xl font-bold text-ink">Top Contributors</h2>
        </div>
        <div className="bg-surface rounded-lg border border-edge overflow-hidden">
          <table className="min-w-full divide-y divide-edge">
            <thead className="bg-canvas">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Contents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Total Views
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Reputation
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-edge">
              {leaderboard.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.overall_rank <= 3 && (
                        <Award
                          className={`h-5 w-5 mr-2 ${
                            user.overall_rank === 1
                              ? 'text-yellow-500'
                              : user.overall_rank === 2
                              ? 'text-muted'
                              : 'text-orange-600'
                          }`}
                        />
                      )}
                      <span className="text-sm font-medium text-ink">
                        #{user.overall_rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-medium text-sm">
                          {user.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-ink">{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                    {user.content_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                    {user.total_views?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 text-sm font-medium bg-primary-100 text-primary-700 rounded-full">
                      {user.reputation_score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}