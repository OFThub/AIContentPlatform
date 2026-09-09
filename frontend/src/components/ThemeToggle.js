'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * The theme lives on <html> as a class, applied by the inline script in
 * layout.jsx before first paint. That makes the DOM the source of truth, so it
 * is read as an external store rather than mirrored into component state --
 * which also avoids a setState-inside-effect cascade.
 */
const subscribe = (onChange) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};

const getSnapshot = () => document.documentElement.classList.contains('dark');

// Rendered on the server, where there is no document. The inline script has
// already corrected the DOM by the time hydration runs.
const getServerSnapshot = () => false;

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // Private mode or blocked storage: the toggle still works for this page.
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="p-2 rounded-lg text-muted hover:text-primary-600 hover:bg-canvas transition-colors"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
