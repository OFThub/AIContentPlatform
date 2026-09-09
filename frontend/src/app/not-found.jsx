import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <h2 className="mb-2">Page not found</h2>
        <p className="text-muted mb-6">That page does not exist, or it moved.</p>
        <Link href="/" className="btn-primary">Back home</Link>
      </div>
    </div>
  );
}
