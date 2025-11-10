'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

import api from '../../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError('Não foi possível enviar as instruções. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-white px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-900">Recuperar senha</h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Informe o e-mail da sua conta para receber um link de redefinição de senha.
        </p>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
              Se o e-mail estiver cadastrado, enviaremos instruções em instantes.
            </div>
            <Link href="/login" className="block text-center text-sm underline text-primary">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <label className="mb-4 block text-sm font-medium text-gray-700">
              E-mail
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:border-primary focus:bg-white focus:outline-none"
                placeholder="seu@email.com"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Enviando...' : 'Enviar link'}
            </button>
            <p className="mt-4 text-center text-xs text-gray-500">
              <Link href="/login" className="underline">
                Voltar ao login
              </Link>
            </p>
          </>
        )}
      </form>
    </div>
  );
}

