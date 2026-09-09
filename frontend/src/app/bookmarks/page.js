"use client";

import { useCallback, useEffect, useState } from "react";
import Layout from "../../components/Layout";
import RequireAuth from "../../components/RequireAuth";
import ContentCard from "../../components/ContentCard";
import { contentAPI } from "../../services/api";
import { BookmarkX } from "lucide-react";
import Spinner from '../../components/Spinner';

function Bookmarks() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await contentAPI.getBookmarks();
      setItems((response && response.data) || []);
      setError("");
    } catch (err) {
      setError("Could not load your bookmarks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    // Optimistic: the list is the only place this row appears.
    setItems((prev) => prev.filter((c) => c.id !== id));
    try {
      await contentAPI.removeBookmark(id);
    } catch (err) {
      setError("Could not remove that bookmark.");
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-1">Bookmarks</h1>
      <p className="text-muted mb-6">{items.length} saved {items.length === 1 ? "item" : "items"}.</p>

      {error && <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted">Nothing saved yet. Bookmark an article to find it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((c) => (
            <div key={c.id} className="relative">
              <ContentCard content={{ ...c, is_bookmarked: true }} />
              <button
                onClick={() => remove(c.id)}
                aria-label={"Remove bookmark from " + c.title}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-canvas transition-colors"
              >
                <BookmarkX className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function BookmarksPage() {
  return (
    <Layout>
      <RequireAuth>
        <Bookmarks />
      </RequireAuth>
    </Layout>
  );
}
