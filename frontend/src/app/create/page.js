"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import RequireAuth from "../../components/RequireAuth";
import { contentAPI } from "../../services/api";
import { Sparkles, PenLine } from "lucide-react";

const TONES = ["neutral", "technical", "casual", "persuasive"];
const LENGTHS = ["short", "medium", "long"];

function CreateForm() {
  const router = useRouter();
  const [mode, setMode] = useState("ai");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [ai, setAi] = useState({ topic: "", tone: "neutral", length: "medium" });
  const [manual, setManual] = useState({ title: "", body: "" });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response =
        mode === "ai"
          ? await contentAPI.generateContent(ai)
          : await contentAPI.createContent(manual);
      const created = response && response.data;
      router.push(created ? "/content/" + (created.slug || created.id) : "/");
    } catch (err) {
      const status = err && err.response && err.response.status;
      const msg = err && err.response && err.response.data && err.response.data.message;
      setError(
        status === 503
          ? "AI generation is off: set GEMINI_API_KEY in .env and restart. You can still write manually."
          : msg || "Could not publish. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const tab = (value, label, Icon) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      className={
        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors " +
        (mode === value ? "bg-primary-600 text-white" : "text-muted hover:bg-canvas")
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="mb-1">Create content</h1>
      <p className="text-muted mb-6">Let the model draft it, or write it yourself.</p>

      <div className="flex gap-2 mb-6">
        {tab("ai", "Generate with AI", Sparkles)}
        {tab("manual", "Write manually", PenLine)}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="card space-y-4">
        {mode === "ai" ? (
          <>
            <div>
              <label htmlFor="topic" className="block text-sm font-medium mb-1">Topic</label>
              <input
                id="topic"
                className="input-field"
                placeholder="How HNSW indexes work in pgvector"
                value={ai.topic}
                onChange={(e) => setAi({ ...ai, topic: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="tone" className="block text-sm font-medium mb-1">Tone</label>
                <select id="tone" className="input-field" value={ai.tone} onChange={(e) => setAi({ ...ai, tone: e.target.value })}>
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="length" className="block text-sm font-medium mb-1">Length</label>
                <select id="length" className="input-field" value={ai.length} onChange={(e) => setAi({ ...ai, length: e.target.value })}>
                  {LENGTHS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
              <input id="title" className="input-field" value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="body" className="block text-sm font-medium mb-1">Body</label>
              <textarea id="body" rows={12} className="input-field" value={manual.body} onChange={(e) => setManual({ ...manual, body: e.target.value })} required />
            </div>
          </>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? (mode === "ai" ? "Generating..." : "Publishing...") : "Publish"}
        </button>
      </form>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Layout>
      <RequireAuth>
        <CreateForm />
      </RequireAuth>
    </Layout>
  );
}
