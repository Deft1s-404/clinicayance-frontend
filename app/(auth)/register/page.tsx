'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';

export default function RegisterPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/register', { name: form.name, email: form.email, password: form.password });
      await login(form.email, form.password);
    } catch (err) {
      setError('Não foi possível criar a conta. Verifique os dados.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-white px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-900">Criar conta</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Preencha os campos para cadastrar um novo usuário.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <label className="mb-4 block text-sm font-medium text-gray-700">
          Nome completo
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:border-primary focus:bg-white focus:outline-none"
            placeholder="Ex.: Maria Silva"
          />
        </label>

        <label className="mb-4 block text-sm font-medium text-gray-700">
          E-mail
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:border-primary focus:bg-white focus:outline-none"
            placeholder="voce@exemplo.com"
          />
        </label>

        <label className="mb-4 block text-sm font-medium text-gray-700">
          Senha
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:border-primary focus:bg-white focus:outline-none"
            placeholder="••••••••"
          />
        </label>

        <label className="mb-6 block text-sm font-medium text-gray-700">
          Confirmar senha
          <input
            type="password"
            required
            value={form.confirm}
            onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:border-primary focus:bg-white focus:outline-none"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Criando...' : 'Criar conta'}
        </button>

        <p className="mt-4 text-center text-xs text-gray-500">
          Já tem conta?{' '}
          <Link className="underline" href="/login">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}

