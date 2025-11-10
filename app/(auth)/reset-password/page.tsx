'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import api from '../../../lib/api';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const emailFromQuery = params.get('email') ?? '';
  const token = params.get('token') ?? '';

  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', { email, token, newPassword: password });
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError('Link inválido ou expirado. Solicite um novo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-white px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-900">Definir nova senha</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Preencha os campos abaixo para redefinir sua senha.</p>

        {done ? (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
            Senha atualizada com sucesso. Redirecionando para o login…
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
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

            <label className="mb-4 block text-sm font-medium text-gray-700">
              Nova senha
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:border-primary focus:bg-white focus:outline-none"
                placeholder="••••••••"
              />
            </label>

            <label className="mb-6 block text-sm font-medium text-gray-700">
              Confirmar senha
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:border-primary focus:bg-white focus:outline-none"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Salvando...' : 'Redefinir senha'}
            </button>

            <p className="mt-4 text-center text-xs text-gray-500">
              <Link href="/forgot-password" className="underline">Solicitar novo link</Link>
            </p>
          </>
        )}
      </form>
    </div>
  );
}

