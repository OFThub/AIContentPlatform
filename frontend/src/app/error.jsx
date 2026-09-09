'use client';

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <h2 className="mb-2">Something went wrong</h2>
        <p className="text-muted mb-6">{error?.message || "An unexpected error occurred."}</p>
        <button onClick={reset} className="btn-primary">Try again</button>
      </div>
    </div>
  );
}
