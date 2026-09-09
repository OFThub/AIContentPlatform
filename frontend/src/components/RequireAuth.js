'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';

/**
 * Client-side guard for authenticated pages.
 *
 * Consumes the `loading` flag the context always exposed but nothing used, so
 * a signed-in visitor is not bounced to /login during the initial profile
 * fetch. Previously the only protection was api.js redirecting on a 401, which
 * is a full page reload that discards React state.
 */
export default function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login');
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return children;
}
