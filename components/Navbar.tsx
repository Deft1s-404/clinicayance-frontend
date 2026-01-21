'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChangeEvent, useMemo, useState } from 'react';
import clsx from 'clsx';

import { Loading } from './Loading';
import { Modal } from './Modal';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useTranslations } from '../hooks/useTranslations';
import type { TranslationKey } from '../lib/i18n';

type IconName =
  | 'dashboard'
  | 'users'
  | 'funnel'
  | 'calendar'
  | 'card'
  | 'megaphone'
  | 'puzzle'
  | 'chart'
  | 'book'
  | 'settings';

type LinkItem = { href: string; labelKey: TranslationKey; icon: IconName };

const links: LinkItem[] = [
  { href: '/dashboard', labelKey: 'navDashboard', icon: 'dashboard' },
  { href: '/clients', labelKey: 'navClients', icon: 'users' },
  { href: '/alunos', labelKey: 'navAlunos', icon: 'users' },
  { href: '/leads', labelKey: 'navLeads', icon: 'funnel' },
  { href: '/course-leads', labelKey: 'navCourseLeads', icon: 'funnel' },
  { href: '/waitlist', labelKey: 'navWaitlist', icon: 'users' },
  { href: '/appointments', labelKey: 'navAppointments', icon: 'calendar' },
  { href: '/calendar', labelKey: 'navCalendar', icon: 'calendar' },
  { href: '/knowledge', labelKey: 'navKnowledge', icon: 'book' },
  { href: '/services', labelKey: 'navServices', icon: 'chart' },
  { href: '/payments', labelKey: 'navPayments', icon: 'card' },
  { href: '/campaigns', labelKey: 'navCampaigns', icon: 'megaphone' },
  { href: '/integrations', labelKey: 'navIntegrations', icon: 'puzzle' },
  { href: '/users', labelKey: 'navUsers', icon: 'users' },
  { href: '/reports', labelKey: 'navReports', icon: 'chart' }
];

function Icon({ name, className }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="5" rx="1" />
          <rect x="13" y="10" width="8" height="11" rx="1" />
          <rect x="3" y="13" width="8" height="8" rx="1" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 21c0-3.314 2.686-6 6-6s6 2.686 6 6" />
          <circle cx="17" cy="9" r="2" />
          <path d="M14.5 21c.4-1.9 1.9-3.5 4-4" />
        </svg>
      );
    case 'funnel':
      return (
        <svg {...common}>
          <path d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 9h16" />
        </svg>
      );
    case 'card':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case 'megaphone':
      return (
        <svg {...common}>
          <path d="M3 11l12-5v12L3 13V11z" />
          <path d="M15 8h2a4 4 0 0 1 4 4 4 4 0 0 1-4 4h-2" />
          <path d="M3 13v4a3 3 0 0 0 3 3h2" />
        </svg>
      );
    case 'puzzle':
      return (
        <svg {...common}>
          <path d="M10 3h4a1 1 0 0 1 1 1v2a2 2 0 1 0 2 2h2a1 1 0 0 1 1 1v4h-3a2 2 0 1 0 0 4h3v4a1 1 0 0 1-1 1h-4v-3a2 2 0 1 0-4 0v3H6a1 1 0 0 1-1-1v-4H2a1 1 0 0 1-1-1v-4h3a2 2 0 1 0 0-4H1V4a1 1 0 0 1 1-1h4v3a2 2 0 1 0 4 0V3z" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 20V6M10 20V10M16 20v-7M21 20H3" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3V4z" />
          <path d="M4 17h15" />
          <path d="M9 7h6" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    default:
      return null;
  }
}

export const Navbar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { language, setLanguage, toggleLanguage, theme, toggleTheme } = useSettings();
  const { t } = useTranslations();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const normalizedRole = user?.role?.toUpperCase();
  const navigationLinks = useMemo(() => {
    if (normalizedRole !== 'ADMIN') {
      const restricted = new Set(['/payments', '/integrations', '/users']);
      return links.filter((link) => !restricted.has(link.href));
    }

    return links;
  }, [normalizedRole]);

  const handleOpenSettings = () => setIsSettingsOpen(true);
  const handleCloseSettings = () => setIsSettingsOpen(false);
  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLanguage(event.target.value === 'es' ? 'es' : 'pt-BR');
  };
  const isDarkMode = theme === 'dark';

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    window.setTimeout(() => {
      logout();
    }, 400);
  };

  return (
    <>
      {/* Mobile header */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <button
          aria-label="Abrir menu"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
        >
          <span className="block h-0.5 w-5 bg-current"></span>
          <span className="mt-1.5 block h-0.5 w-5 bg-current"></span>
          <span className="mt-1.5 block h-0.5 w-5 bg-current"></span>
        </button>
        <div className="flex items-center gap-2">
          <Image src="/image.png" alt="Marca Clí­nica Yance" width={28} height={28} />
          <span className="text-base font-semibold text-primary">Clí­nica Yance</span>
        </div>
        <button
          aria-label="Abrir configuracoes"
          onClick={handleOpenSettings}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
        >
          <Icon name="settings" className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      <div className={clsx('fixed inset-0 z-50 md:hidden', mobileOpen ? 'block' : 'hidden')}>
        <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
        <aside
          className={clsx(
            'absolute left-0 top-0 h-full w-72 translate-x-0 border-r bg-white shadow-xl transition-transform',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center gap-3 px-5 py-4">
            <Image src="/image.png" alt="Marca ClÃ­nica Yance" width={32} height={32} />
            <span className="text-lg font-semibold text-primary">Clí­nica Yance</span>
            <button
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
              className="ml-auto rounded-md p-2 text-gray-600 hover:bg-gray-100"
            >
              âœ•
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2 text-sm text-gray-700">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'block rounded-md px-3 py-2 transition',
                  pathname.startsWith(link.href)
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-gray-100 hover:text-primary-dark'
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon name={link.icon} className="h-5 w-5" />
                  <span>{t(link.labelKey)}</span>
                </span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto border-t px-4 py-4">
            <div className="mb-3 text-xs">
              <p className="font-semibold text-gray-700">{user?.name}</p>
              <p className="text-gray-400">{user?.email}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                {t('actionConfigure')}
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={clsx(
                  'w-full rounded-lg border border-primary px-3 py-2 text-xs font-semibold transition',
                  isLoggingOut
                    ? 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400'
                    : 'text-primary hover:bg-primary hover:text-white'
                )}
              >
                {isLoggingOut ? t('actionLoggingOut') : t('actionLogout')}
              </button>
            </div>
          </div>
        </aside>
      </div>

      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:flex-col w-64 shrink-0 border-r bg-white">
        <div className="flex items-center gap-3 px-5 py-4">
          <Image src="/image.png" alt="Marca Clí­nica Yance" width={36} height={36} />
          <span className="text-lg font-semibold text-primary">Clí­nica Yance</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2 text-sm text-gray-700">
          {navigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'block rounded-md px-3 py-2 transition',
                pathname.startsWith(link.href)
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-gray-100 hover:text-primary-dark'
              )}
            >
              <span className="flex items-center gap-3">
                <Icon name={link.icon} className="h-5 w-5" />
                <span>{t(link.labelKey)}</span>
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t px-4 py-4">
          <div className="mb-3 text-xs">
            <p className="font-semibold text-gray-700">{user?.name}</p>
            <p className="text-gray-400">{user?.email}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleOpenSettings}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Configuracoes
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={clsx(
                'w-full rounded-lg border border-primary px-3 py-2 text-xs font-semibold transition',
                isLoggingOut
                  ? 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400'
                  : 'text-primary hover:bg-primary hover:text-white'
              )}
            >
              {isLoggingOut ? t('actionLoggingOut') : t('actionLogout')}
            </button>
          </div>
        </div>
      </aside>

      {isLoggingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loading />
        </div>
      )}

      <Modal title={t('settingsTitle')} isOpen={isSettingsOpen} onClose={handleCloseSettings}>
        <div className="space-y-6">
          <section className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{t('settingsLanguageTitle')}</p>
              <p className="text-xs text-gray-500">{t('settingsLanguageDescription')}</p>
            </div>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="pt-BR">{t('selectLanguagePt')}</option>
              <option value="es">{t('selectLanguageEs')}</option>
            </select>
            <button
              type="button"
              onClick={toggleLanguage}
              className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
            >
              {t('settingsLanguageToggle')}
            </button>
          </section>

          <section className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{t('settingsThemeTitle')}</p>
              <p className="text-xs text-gray-500">{t('settingsThemeDescription')}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {isDarkMode ? t('settingsThemeActive') : t('settingsThemeInactive')}
                </p>
                <p className="text-xs text-gray-500">
                  {isDarkMode ? t('settingsThemeStatusDark') : t('settingsThemeStatusLight')}
                </p>
              </div>
              <button
                type="button"
                aria-pressed={isDarkMode}
                onClick={toggleTheme}
                className={clsx(
                  'relative inline-flex h-6 w-12 items-center rounded-full transition',
                  isDarkMode ? 'bg-primary' : 'bg-gray-300'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-5 w-5 transform rounded-full bg-white transition',
                    isDarkMode ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </section>
        </div>
      </Modal>
    </>
  );
};
