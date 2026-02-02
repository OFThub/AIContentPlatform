import Navbar from './Navbar';
import { AuthProvider } from '../contexts/AuthContext'; 

export default function Layout({ children }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="bg-white border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-gray-600">
              <p className="font-medium mb-2">AI Content Platform</p>
              <p className="text-sm text-gray-500">
                Powered by PostgreSQL, Redis, OpenAI & Next.js
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Features: Semantic Search • Window Functions • Materialized Views • Real-time Analytics
              </p>
            </div>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}