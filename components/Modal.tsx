'use client';

import { ReactNode } from 'react';

const sizeClassMap = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl'
} as const;

type ModalSize = keyof typeof sizeClassMap;

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  className?: string;
  closeOnBackdrop?: boolean;
}

export const Modal = ({
  title,
  isOpen,
  onClose,
  children,
  size = 'md',
  className = '',
  closeOnBackdrop = false
}: ModalProps) => {
  if (!isOpen) {
    return null;
  }

  const containerClasses = `w-full ${sizeClassMap[size]} rounded-2xl bg-white p-6 shadow-2xl ${className}`.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <div className={containerClasses} onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-500 transition hover:bg-gray-200"
            aria-label="Fechar modal"
          >
            Fechar
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
};
