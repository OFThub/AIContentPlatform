'use client';

import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <footer className="bg-surface border-t border-edge mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-muted">
            <p className="font-medium mb-2 text-ink">AI Content Platform</p>
            <p className="text-sm">Powered by PostgreSQL + pgvector, Redis, Gemini and Next.js</p>
            <p className="text-xs mt-2">
              Semantic Search &bull; Window Functions &bull; Materialized Views &bull; Real-time Analytics
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
