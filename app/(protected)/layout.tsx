'use client';

import { Navbar } from '../../components/Navbar';
import { Loading } from '../../components/Loading';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const isReady = useProtectedRoute();

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
