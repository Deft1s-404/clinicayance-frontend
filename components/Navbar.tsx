'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';

import { Loading } from './Loading';
import { useAuth } from '../hooks/useAuth';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/clients', label: 'Clientes' },
  { href: '/leads', label: 'Leads' },
  { href: '/appointments', label: 'Consultas' },
  { href: '/payments', label: 'Pagamentos' },
  { href: '/campaigns', label: 'Campanhas' },
  { href: '/integrations', label: 'Integrações' },
  { href: '/reports', label: 'Relatórios' }
];

export const Navbar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    window.setTimeout(() => {
      logout();
    }, 400);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="text-lg font-semibold text-primary">Clínica Yance</span>

            <nav className="hidden gap-4 text-sm text-gray-600 md:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'rounded-md px-3 py-2 transition',
                    pathname.startsWith(link.href)
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-gray-100 hover:text-primary-dark'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <p className="font-semibold text-gray-700">{user?.name}</p>
              <p className="text-gray-400">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={clsx(
                'rounded-lg border border-primary px-3 py-2 text-xs font-semibold transition',
                isLoggingOut
                  ? 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400'
                  : 'text-primary hover:bg-primary hover:text-white'
              )}
            >
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </div>
      </header>

      {isLoggingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loading />
        </div>
      )}
    </>
  );
};
