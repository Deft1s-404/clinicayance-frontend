'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from './useAuth';

export const useRoleGuard = (allowedRoles: string[], redirectTo = '/dashboard') => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const normalizedAllowedRoles = useMemo(
    () => allowedRoles.map((role) => role.toUpperCase()),
    [allowedRoles]
  );

  const isAuthorized = useMemo(() => {
    if (!user?.role) {
      return false;
    }
    return normalizedAllowedRoles.includes(user.role.toUpperCase());
  }, [normalizedAllowedRoles, user?.role]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      return;
    }

    if (!isAuthorized) {
      router.replace(redirectTo);
    }
  }, [isAuthorized, loading, redirectTo, router, user]);

  return { isAuthorized, loading };
};
