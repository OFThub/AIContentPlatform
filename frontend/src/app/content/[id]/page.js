"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../contexts/AuthContext";
import { contentAPI } from "../../../services/api";
import { Eye, Heart, Share2, Bookmark, MessageCircle, Trash2 } from "lucide-react";
import Spinner from '../../../components/Spinner';

const relativeTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true });
};

export default function ContentDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();

  const [content, setContent] = useState(null);
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const loadComments = useCallback(async (contentId) => {
    try {
      const response = await contentAPI.getComments(contentId);
      setComments((response && response.data) || []);
    } catch (err) {
      // Comments are secondary; a failure here must not blank the article.
      setComments([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await contentAPI.getContent(id);
        const data = response && response.data;
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setContent(data);
        loadComments(data.id);
      } catch (err) {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadComments]);

  const act = async (fn, optimistic) => {
    if (!isAuthenticated) {
      setError("Sign in to do that.");
      return;
    }
    setContent((prev) => ({ ...prev, ...optimistic(prev) }));
    try {
      await fn(content.id);
      setError("");
    } catch (err) {
      setError("That action did not go through.");
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    try {
      await contentAPI.addComment(content.id, { body });
      setDraft("");
      setContent((prev) => ({ ...prev, comment_count: Number(prev.comment_count || 0) + 1 }));
      loadComments(content.id);
    } catch (err) {
      setError("Could not post your comment.");
    }
  };

  const removeComment = async (commentId) => {
    try {
      await contentAPI.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setContent((prev) => ({
        ...prev,
        comment_count: Math.max(Number(prev.comment_count || 1) - 1, 0),
      }));
    } catch (err) {
      setError("Could not delete that comment.");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </Layout>
    );
  }

  if (notFound || !content) {
    return (
      <Layout>
        <div className="card text-center py-12 max-w-lg mx-auto">
          <h1 className="mb-2">Content not found</h1>
          <p className="text-muted mb-6">It may have been deleted or unpublished.</p>
          <Link href="/" className="btn-primary">
            Back home
          </Link>
        </div>
      </Layout>
    );
  }

  const when = relativeTime(content.created_at);

  return (
    <Layout>
      <article className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          {content.category_name && <span className="chip">{content.category_name}</span>}
          {(content.tags || []).map((t) => (
            <span key={t.id} className="text-xs text-muted">
              #{t.name}
            </span>
          ))}
        </div>

        <h1 className="mb-3">{content.title}</h1>

        <div className="flex items-center gap-3 text-sm text-muted mb-8 pb-6 border-b border-edge">
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-medium">
              {content.username && content.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-ink">{content.username}</p>
            {when && <p className="text-xs">{when}</p>}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="whitespace-pre-wrap leading-relaxed text-ink mb-10">{content.body}</div>

        <div className="flex items-center gap-3 flex-wrap py-4 border-y border-edge mb-10">
          <span className="flex items-center gap-1 text-muted text-sm">
            <Eye className="h-4 w-4" />
            {content.view_count || 0}
          </span>

          <button
            onClick={() =>
              act(contentAPI.likeContent, (p) => ({ like_count: Number(p.like_count || 0) + 1 }))
            }
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Heart className="h-4 w-4" />
            {content.like_count || 0}
          </button>

          <button
            onClick={() =>
              act(contentAPI.shareContent, (p) => ({ share_count: Number(p.share_count || 0) + 1 }))
            }
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>

          <button
            onClick={() =>
              act(
                content.is_bookmarked ? contentAPI.removeBookmark : contentAPI.bookmarkContent,
                (p) => ({ is_bookmarked: !p.is_bookmarked })
              )
            }
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Bookmark
              className={"h-4 w-4 " + (content.is_bookmarked ? "fill-current text-primary-600" : "")}
            />
            {content.is_bookmarked ? "Saved" : "Save"}
          </button>
        </div>

        <section>
          <h2 className="mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary-600" />
            Comments ({content.comment_count || 0})
          </h2>

          {isAuthenticated ? (
            <form onSubmit={submitComment} className="mb-8">
              <textarea
                rows={3}
                className="input-field mb-3"
                placeholder="Add a comment"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" className="btn-primary" disabled={!draft.trim()}>
                Post comment
              </button>
            </form>
          ) : (
            <p className="text-muted mb-8">
              <Link href="/login" className="text-primary-600 font-medium">
                Sign in
              </Link>{" "}
              to join the discussion.
            </p>
          )}

          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{c.username}</p>
                    <p className="text-xs text-muted mb-2">{relativeTime(c.created_at)}</p>
                    <p className="text-ink whitespace-pre-wrap">{c.body}</p>
                  </div>
                  {user && user.id === c.user_id && (
                    <button
                      onClick={() => removeComment(c.id)}
                      aria-label="Delete comment"
                      className="p-1.5 rounded-lg text-muted hover:text-red-600 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {comments.length === 0 && <p className="text-muted">No comments yet.</p>}
          </div>
        </section>
      </article>
    </Layout>
  );
}
