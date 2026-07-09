import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/beys', label: 'Beys' },
  { to: '/parts', label: 'Parts' },
  { to: '/configurator', label: 'Configurator' },
  { to: '/profile', label: 'My Profile' },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Beyblade X Companion
            </Link>
            <nav className="flex flex-wrap gap-4">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`text-sm font-medium ${
                    location.pathname === item.to
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-500">
          Ratings shown are community estimates, not official Takara Tomy stats.
        </div>
      </footer>
    </div>
  );
}
