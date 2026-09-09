import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../contexts/AuthContext';

// The old tailwind.config.js asked for Inter but nothing ever loaded it, so the
// app silently fell back to the system stack.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata = {
  title: {
    default: 'AI Content Platform',
    template: '%s | AI Content Platform',
  },
  description:
    'Semantic search, AI content generation and SQL-powered analytics on PostgreSQL, pgvector and Redis.',
};

/**
 * Applies the stored theme before first paint. Without this the page renders
 * light and then flips, which is worse than no dark mode at all.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/* The only AuthProvider in the tree. components/Layout.js used to mount
            a second one, so the navbar read a different auth state than the
            pages and never noticed a successful login. */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
