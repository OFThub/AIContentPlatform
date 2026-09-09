'use client';

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import { Search, User, LogOut, Plus, TrendingUp, BarChart3, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  const navLink = 'flex items-center space-x-1 text-muted hover:text-primary-600 transition-colors';
  const menuItem = 'block px-4 py-2 text-sm text-ink hover:bg-canvas';

  return (
    <nav className="bg-surface border-b border-edge sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-linear-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
            <span className="text-xl font-bold text-ink">ContentHub</span>
          </Link>

          <div className="flex items-center space-x-4 sm:space-x-6">
            <Link href="/search" className={navLink}>
              <Search className="h-5 w-5" />
              <span className="font-medium hidden sm:inline">Search</span>
            </Link>

            <Link href="/trending" className={navLink}>
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium hidden sm:inline">Trending</span>
            </Link>

            <Link href="/dashboard" className={navLink}>
              <LayoutDashboard className="h-5 w-5" />
              <span className="font-medium hidden sm:inline">Dashboard</span>
            </Link>

            <Link href="/analytics" className={navLink}>
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium hidden sm:inline">Analytics</span>
            </Link>

            <ThemeToggle />

            {isAuthenticated ? (
              <>
                <Link
                  href="/create"
                  className="flex items-center space-x-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium hidden sm:inline">Create</span>
                </Link>

                <div className="relative group">
                  <button
                    className="flex items-center space-x-2 text-muted hover:text-primary-600 transition-colors"
                    aria-label="Account menu"
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                  </button>

                  <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg border border-edge py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="px-4 py-2 border-b border-edge">
                      <p className="text-sm font-medium text-ink">{user?.username}</p>
                      <p className="text-xs text-muted">{user?.email}</p>
                    </div>

                    <Link href="/profile" className={menuItem}>My Profile</Link>
                    <Link href="/my-content" className={menuItem}>My Content</Link>
                    <Link href="/bookmarks" className={menuItem}>Bookmarks</Link>

                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-canvas flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-muted hover:text-primary-600 font-medium transition-colors">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
