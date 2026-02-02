import { useState } from 'react';
import Layout from '../components/Layout';
import ContentCard from '../components/ContentCard';
import { contentAPI } from '../services/api';
import { Search, Sparkles, Zap } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState('semantic'); // semantic or keyword
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      if (searchType === 'semantic') {
        const response = await contentAPI.semanticSearch(query);
        setResults(response.data);
      } else {
        const response = await contentAPI.getContents({ search: query });
        setResults(response.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Search Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI-Powered Search
          </h1>
          <p className="text-gray-600">
            Search using natural language or keywords
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Search Type Toggle */}
            <div className="flex justify-center space-x-2 mb-4">
              <button
                type="button"
                onClick={() => setSearchType('semantic')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  searchType === 'semantic'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>Semantic (AI)</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchType('keyword')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  searchType === 'keyword'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Search className="h-4 w-4" />
                <span>Keyword</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  searchType === 'semantic'
                    ? 'Try: "articles about AI that explain complex concepts simply"'
                    : 'Search by keywords...'
                }
                className="w-full px-6 py-4 pr-12 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-2 p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Info Box */}
            {searchType === 'semantic' && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Zap className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-900">
                      AI Semantic Search
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      Uses OpenAI embeddings to understand the meaning of your query.
                      Results are ranked by semantic similarity, not just keyword matching.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Example Queries */}
        {!searched && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Try these example searches:
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                'beginner-friendly programming tutorials',
                'articles about machine learning',
                'how to improve productivity',
                'latest tech innovations',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setQuery(example);
                    setSearchType('semantic');
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-purple-300 hover:bg-purple-50 transition-all"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {searched && !loading && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {results.length} results found
              </h2>
              {searchType === 'semantic' && results.length > 0 && (
                <span className="text-sm text-gray-600">
                  Ranked by similarity score
                </span>
              )}
            </div>

            {results.length > 0 ? (
              <div className="space-y-6">
                {results.map((content, index) => (
                  <div key={content.id} className="relative">
                    {searchType === 'semantic' && content.similarity_score && (
                      <div className="absolute -left-12 top-6 text-sm font-medium text-purple-600">
                        {(content.similarity_score * 100).toFixed(0)}%
                      </div>
                    )}
                    <ContentCard content={content} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  No results found
                </h3>
                <p className="text-gray-600">
                  Try different keywords or use semantic search
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}