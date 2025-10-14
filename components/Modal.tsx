'use client';

import { ReactNode } from 'react';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const Modal = ({ title, isOpen, onClose, children }: ModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
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
