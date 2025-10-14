'use client';

import clsx from 'clsx';

interface StatusBadgeProps {
  value: string;
}

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  new: 'bg-blue-100 text-blue-700',
  vip: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-emerald-100 text-emerald-700'
};

export const StatusBadge = ({ value }: StatusBadgeProps) => {
  const normalized = value.toLowerCase();
  return (
    <span
      className={clsx(
        'rounded-full px-3 py-1 text-xs font-semibold capitalize',
        statusStyles[normalized] ?? 'bg-gray-100 text-gray-600'
      )}
    >
      {value.replace(/_/g, ' ')}
    </span>
  );
};
