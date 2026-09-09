"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import RequireAuth from "../../components/RequireAuth";
import { useAuth } from "../../contexts/AuthContext";
import { contentAPI } from "../../services/api";
import { Trash2, Eye, Heart, MessageCircle, Plus } from "lucide-react";
import Spinner from '../../components/Spinner';

function MyContent() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const response = await contentAPI.getContents({ userId: user.id, limit: 50 });
      setItems((response && response.data) || []);
      setError("");
    } catch (err) {
      setError("Could not load your content.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id, title) => {
    if (!window.confirm('Delete "' + title + '"? This cannot be undone.')) return;
    setPendingId(id);
    try {
      await contentAPI.deleteContent(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError("Could not delete that content.");
    } finally {
      setPendingId(null);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="mb-1">My content</h1>
          <p className="text-muted">{items.length} published {items.length === 1 ? "item" : "items"}.</p>
        </div>
        <Link href="/create" className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> New
        </Link>
      </div>

      {error && <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-muted mb-4">You have not published anything yet.</p>
          <Link href="/create" className="btn-primary">Write your first article</Link>
        </div>
      ) : (
        <div className="card p-0 divide-y divide-edge">
          {items.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-4">
              <div className="min-w-0 flex-1">
                <Link href={"/content/" + (c.slug || c.id)} className="font-medium text-ink hover:text-primary-600">
                  {c.title}
                </Link>
                <div className="flex items-center gap-4 text-sm text-muted mt-1">
                  <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{c.view_count || 0}</span>
                  <span className="flex items-center gap-1"><Heart className="h-4 w-4" />{c.like_count || 0}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />{c.comment_count || 0}</span>
                  {c.category_name && <span className="chip">{c.category_name}</span>}
                </div>
              </div>
              <button
                onClick={() => remove(c.id, c.title)}
                disabled={pendingId === c.id}
                aria-label={"Delete " + c.title}
                className="p-2 rounded-lg text-muted hover:text-red-600 hover:bg-canvas transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function MyContentPage() {
  return (
    <Layout>
      <RequireAuth>
        <MyContent />
      </RequireAuth>
    </Layout>
  );
}
