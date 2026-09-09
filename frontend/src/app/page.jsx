'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import ContentCard from '../components/ContentCard';
import { contentAPI } from '../services/api';
import { TrendingUp, Clock, Star, Sparkles } from 'lucide-react';
import Spinner from '../components/Spinner';

export default function Home() {
  const [contents, setContents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recent');

  // Declared before the effect and memoised on activeTab, so the effect can
  // depend on it honestly instead of lying about its dependencies.
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      if (activeTab === 'recent') {
        const response = await contentAPI.getContents({ sortBy: 'recent', limit: 12 });
        setContents(response.data);
      } else if (activeTab === 'popular') {
        const response = await contentAPI.getPopular({ limit: 12 });
        setPopular(response.data);
      } else if (activeTab === 'trending') {
        const response = await contentAPI.getTrending({ limit: 12 });
        setTrending(response.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabs = [
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'popular', label: 'Popular', icon: Star },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-linear-to-br from-primary-500 to-primary-700 rounded-2xl">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-ink mb-4">
          AI-Powered Content Platform
        </h1>
        <p className="text-xl text-muted max-w-2xl mx-auto">
          Discover amazing content with semantic search, real-time analytics, and trending insights
        </p>
        <div className="mt-6 flex justify-center space-x-4 text-sm text-muted">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Semantic Search</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Real-time Analytics</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
            <span>Advanced PostgreSQL</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center space-x-2 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-surface text-ink hover:bg-canvas'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Spinner />
        </div>
      )}

      {/* Content Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'recent' &&
            contents.map((content) => (
              <ContentCard key={content.id} content={content} />
            ))}
          {activeTab === 'popular' &&
            popular.map((content) => (
              <ContentCard key={content.id} content={content} />
            ))}
          {activeTab === 'trending' &&
            trending.map((content) => (
              <ContentCard key={content.id} content={content} showTrend />
            ))}
        </div>
      )}

      {/* Empty State */}
      {!loading &&
        activeTab === 'recent' &&
        contents.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted text-lg">No content available yet</p>
            <p className="text-muted mt-2">Be the first to create content!</p>
          </div>
        )}
    </Layout>
  );
}