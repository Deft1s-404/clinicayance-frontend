'use client';

import { FormEvent, useState } from 'react';

import { useAuth } from '../../../hooks/useAuth';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [formState, setFormState] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(formState.email, formState.password);
    } catch (e) {
      setError('Credenciais inválidas. Verifique e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || loading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-white">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl"
      >
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Clínica Yance CRM</h1>
        <p className="mb-8 text-sm text-gray-500">
          Faça login para acessar o dashboard da clínica estética.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">E-mail</span>
          <input
            type="email"
            required
            value={formState.email}
            onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 transition focus:border-primary focus:bg-white focus:outline-none"
            placeholder="admin@clinicayance.com"
          />
        </label>

        <label className="mb-6 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Senha</span>
          <input
            type="password"
            required
            value={formState.password}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, password: event.target.value }))
            }
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 transition focus:border-primary focus:bg-white focus:outline-none"
            placeholder="••••••"
          />
        </label>

        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="mt-6 text-center text-xs text-gray-400">
          Usuário padrão: admin@clinicayance.com / senha: admin123
        </p>
      </form>
    </div>
  );
}
