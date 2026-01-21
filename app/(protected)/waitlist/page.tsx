'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import api from '../../../lib/api';
import { WaitlistEntry } from '../../../types';

interface WaitlistResponse {
  data: WaitlistEntry[];
  total: number;
  page: number;
  limit: number;
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    desiredCourse: '',
    country: ''
  });
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryPendingDeletion, setEntryPendingDeletion] = useState<WaitlistEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit || 1)), [total, limit]);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const fetchEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<WaitlistResponse>('/waitlist', {
        params: {
          page,
          limit,
          search: searchQuery || undefined,
          country: countryFilter || undefined,
          desiredCourse: courseFilter || undefined
        }
      });
      setEntries(response.data.data);
      setTotal(response.data.total);
    } catch (e) {
      console.error(e);
      setError('Não foi possível carregar a lista de espera.');
    } finally {
      setIsLoading(false);
    }
  }, [countryFilter, courseFilter, limit, page, searchQuery]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const resetForm = () => {
    setFormState({
      name: '',
      email: '',
      phone: '',
      desiredCourse: '',
      country: ''
    });
    setEditingEntryId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      const payload = {
        name: formState.name.trim() || undefined,
        email: formState.email.trim() || undefined,
        phone: formState.phone.trim() || undefined,
        desiredCourse: formState.desiredCourse.trim() || undefined,
        country: formState.country.trim() || undefined
      };
      if (editingEntryId) {
        await api.patch(`/waitlist/${editingEntryId}`, payload);
      } else {
        await api.post('/waitlist', payload);
      }
      setIsModalOpen(false);
      resetForm();
      setPage(1);
      await fetchEntries();
    } catch (e) {
      console.error(e);
      setError('Erro ao adicionar à lista de espera.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const openModal = (entry?: WaitlistEntry) => {
    if (entry) {
      setEditingEntryId(entry.id);
      setFormState({
        name: entry.name ?? '',
        email: entry.email ?? '',
        phone: entry.phone ?? '',
        desiredCourse: entry.desiredCourse ?? '',
        country: entry.country ?? ''
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const requestDeleteEntry = (entry: WaitlistEntry) => {
    setEntryPendingDeletion(entry);
  };

  const handleDeleteEntry = async () => {
    if (!entryPendingDeletion) {
      return;
    }
    try {
      setIsDeleting(true);
      setError(null);
      await api.delete(`/waitlist/${entryPendingDeletion.id}`);
      setEntryPendingDeletion(null);
      await fetchEntries();
    } catch (e) {
      console.error(e);
      setError('Erro ao remover o interessado.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (!isDeleting) {
      setEntryPendingDeletion(null);
    }
  };

  const handleApplyFilters = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Lista de espera</h1>
          <p className="text-sm text-gray-500">
            Centralize os contatos interessados em cursos e priorize o follow-up.
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} por página
              </option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Novo interessado
          </button>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl bg-white p-4 shadow md:grid-cols-4">
        <label className="text-xs font-semibold uppercase text-gray-500 md:col-span-2">
          Busca livre
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleApplyFilters();
                }
              }}
              placeholder="Nome ou contato (email/telefone)..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyFilters}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Buscar
            </button>
          </div>
        </label>

        <label className="text-xs font-semibold uppercase text-gray-500">
          País
          <input
            value={countryFilter}
            onChange={(event) => {
              setCountryFilter(event.target.value);
              setPage(1);
            }}
            placeholder="Brasil, Panamá..."
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold uppercase text-gray-500">
          Curso desejado
          <input
            value={courseFilter}
            onChange={(event) => {
              setCourseFilter(event.target.value);
              setPage(1);
            }}
            placeholder="Mentoria, imersão..."
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="rounded-2xl bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Contato</th>
              <th className="px-6 py-3">Curso desejado</th>
              <th className="px-6 py-3">País</th>
              <th className="px-6 py-3">Criado em</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-gray-500">
                  Nenhum interessado encontrado.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{entry.name ?? 'Sem nome'}</p>
                    <p className="text-xs text-gray-400">{entry.email ?? '--'}</p>
                    <p className="text-xs text-gray-400">{entry.phone ?? '--'}</p>
                  </td>
                  <td className="px-6 py-4">{entry.desiredCourse ?? '--'}</td>
                  <td className="px-6 py-4">{entry.country ?? '--'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(entry.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(entry)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => requestDeleteEntry(entry)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
        <p>
          {isLoading
            ? 'Carregando interessados...'
            : total > 0
            ? `Exibindo ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} de ${total} registros`
            : 'Nenhum registro'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => canGoPrevious && setPage((prev) => Math.max(1, prev - 1))}
            disabled={!canGoPrevious || isLoading}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-xs font-semibold text-gray-500">
            Página {Math.min(page, totalPages)} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => canGoNext && setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={!canGoNext || isLoading}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>

      <Modal
        title={editingEntryId ? 'Atualizar interessado' : 'Novo interessado'}
        isOpen={isModalOpen}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit} className="grid gap-4 text-sm">
          <label>
            Nome
            <input
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Telefone / WhatsApp
            <input
              value={formState.phone}
              onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Curso de interesse
            <input
              value={formState.desiredCourse}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, desiredCourse: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            País
            <input
              value={formState.country}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, country: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Salvando...' : editingEntryId ? 'Atualizar' : 'Adicionar'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={entryPendingDeletion !== null}
        title="Remover interessado"
        description={
          entryPendingDeletion ? (
            <p>
              Deseja remover{' '}
              <span className="font-semibold text-slate-900">{entryPendingDeletion.name ?? 'este contato'}</span> da
              lista de espera?
            </p>
          ) : null
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirmLoading={isDeleting}
        onConfirm={handleDeleteEntry}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
