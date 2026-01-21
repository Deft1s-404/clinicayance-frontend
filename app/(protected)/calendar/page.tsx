'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import api from '../../../lib/api';
import { CalendarEntry, CalendarEntryType } from '../../../types';

interface CalendarEntriesResponse {
  data: CalendarEntry[];
  total: number;
}

type CalendarFormState = {
  title: string;
  description: string;
  type: CalendarEntryType;
  start: string;
  end: string;
  allDay: boolean;
  timezone: string;
  country: string;
  city: string;
  location: string;
  notes: string;
};

const typeLabels: Record<CalendarEntryType, string> = {
  AVAILABLE: 'Disponível para atendimento',
  TRAVEL: 'Em viagem',
  BLOCKED: 'Indisponível'
};

const typeStyles: Record<CalendarEntryType, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  TRAVEL: 'bg-amber-100 text-amber-700',
  BLOCKED: 'bg-rose-100 text-rose-700'
};

const defaultFormState: CalendarFormState = {
  title: '',
  description: '',
  type: 'AVAILABLE',
  start: '',
  end: '',
  allDay: false,
  timezone: '',
  country: '',
  city: '',
  location: '',
  notes: ''
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

const isoToLocalInput = (isoDate: string) => {
  const date = new Date(isoDate);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const localInputToIso = (value: string) => new Date(value).toISOString();

export default function CalendarPage() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const [onlyFuture, setOnlyFuture] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<CalendarFormState>(defaultFormState);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryPendingDeletion, setEntryPendingDeletion] = useState<CalendarEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit || 1)), [total, limit]);

  const filtersLabel = useMemo(() => {
    if (!selectedType && !searchQuery && !onlyFuture) {
      return 'sem filtros';
    }

    return [
      selectedType ? `tipo: ${typeLabels[selectedType as CalendarEntryType] ?? selectedType}` : null,
      searchQuery ? `busca: "${searchQuery}"` : null,
      onlyFuture ? 'somente futuros' : null
    ]
      .filter(Boolean)
      .join(' | ');
  }, [selectedType, searchQuery, onlyFuture]);

  const fetchEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<CalendarEntriesResponse>('/calendar', {
        params: {
          limit,
          page,
          type: selectedType || undefined,
          search: searchQuery || undefined,
          onlyFuture: onlyFuture || undefined
        }
      });
      setEntries(response.data.data);
      setTotal(response.data.total);
    } catch (e) {
      console.error(e);
      setError('Não foi possível carregar o calendário.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, searchQuery, onlyFuture, page, limit]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const handleSearch = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingEntryId(null);
  };

  const openModal = (entry?: CalendarEntry) => {
    if (entry) {
      setEditingEntryId(entry.id);
      setFormState({
        title: entry.title,
        description: entry.description ?? '',
        type: entry.type,
        start: isoToLocalInput(entry.start),
        end: isoToLocalInput(entry.end),
        allDay: entry.allDay,
        timezone: entry.timezone ?? '',
        country: entry.country ?? '',
        city: entry.city ?? '',
        location: entry.location ?? '',
        notes: entry.notes ?? ''
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
    setIsSubmitting(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.start || !formState.end) {
      setError('Informe o período completo.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: formState.title.trim(),
        description: formState.description.trim() || undefined,
        type: formState.type,
        start: localInputToIso(formState.start),
        end: localInputToIso(formState.end),
        allDay: formState.allDay,
        timezone: formState.timezone.trim() || undefined,
        country: formState.country.trim() || undefined,
        city: formState.city.trim() || undefined,
        location: formState.location.trim() || undefined,
        notes: formState.notes.trim() || undefined
      };

      if (editingEntryId) {
        await api.patch(`/calendar/${editingEntryId}`, payload);
      } else {
        await api.post('/calendar', payload);
      }

      closeModal();
      await fetchEntries();
    } catch (e) {
      console.error(e);
      setError('Erro ao salvar o horário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteEntry = (entry: CalendarEntry) => {
    setEntryPendingDeletion(entry);
  };

  const handleDeleteEntry = async () => {
    if (!entryPendingDeletion) {
      return;
    }

    try {
      setIsDeleting(true);
      await api.delete(`/calendar/${entryPendingDeletion.id}`);
      setEntryPendingDeletion(null);
      await fetchEntries();
    } catch (e) {
      console.error(e);
      setError('Erro ao remover o horário.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (!isDeleting) {
      setEntryPendingDeletion(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Calendário da clínica</h1>
          <p className="text-sm text-gray-500">
            Configure horários de atendimento, viagens internacionais e bloqueios para o agente de IA.
          </p>
        </div>
        <div className="flex gap-3">
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
            value={selectedType}
            onChange={(event) => {
              setSelectedType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Novo horário
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs font-semibold uppercase text-gray-500">
            Busca livre
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="País, cidade, título..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                Buscar
              </button>
            </div>
          </label>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Somente futuros
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <input
                id="onlyFuture"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={onlyFuture}
                onChange={(event) => {
                  setOnlyFuture(event.target.checked);
                  setPage(1);
                }}
              />
              <span className="text-sm text-gray-700">Exibir apenas eventos ainda não iniciados</span>
            </div>
          </label>
          <div className="text-xs font-semibold uppercase text-gray-500">
            Filtros ativos
            <div className="mt-1 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-600">
              {filtersLabel || 'sem filtros'}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="rounded-2xl bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Título</th>
              <th className="px-6 py-3">Período</th>
              <th className="px-6 py-3">Localização</th>
              <th className="px-6 py-3">Tipo</th>
              <th className="px-6 py-3">All day</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                  Carregando calendário...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                  Nenhum horário cadastrado para os filtros atuais.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{entry.title}</p>
                    {(entry.description || entry.notes) && (
                      <p className="text-xs text-gray-400">
                        {[entry.description, entry.notes].filter(Boolean).join(' | ')}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p>{formatDateTime(entry.start)}</p>
                    <p className="text-xs text-gray-400">{`até ${formatDateTime(entry.end)}`}</p>
                    {entry.timezone && (
                      <p className="text-xs text-gray-400">Fuso: {entry.timezone}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p>{entry.location || entry.city || '—'}</p>
                    {(entry.city || entry.country) && (
                      <p className="text-xs text-gray-400">
                        {[entry.city, entry.country].filter(Boolean).join(' - ')}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${typeStyles[entry.type]}`}
                    >
                      {typeLabels[entry.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4">{entry.allDay ? 'Sim' : 'Não'}</td>
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
        <div className="space-x-4">
          <span>Total de eventos: {total}</span>
          <span>
            Página {page} de {totalPages}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs uppercase text-gray-500">
            Por página
            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm focus:border-primary focus:outline-none"
            >
              {[10, 20, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      <Modal
        title={editingEntryId ? 'Atualizar horário' : 'Novo horário no calendário'}
        isOpen={isModalOpen}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Título
              <input
                required
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>

            <label className="text-sm">
              Tipo
              <select
                value={formState.type}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, type: event.target.value as CalendarEntryType }))
                }
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Início
              <input
                required
                type="datetime-local"
                value={formState.start}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, start: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>

            <label className="text-sm">
              Fim
              <input
                required
                type="datetime-local"
                value={formState.end}
                onChange={(event) => setFormState((prev) => ({ ...prev, end: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={formState.allDay}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, allDay: event.target.checked }))
              }
            />
            <span>Evento dura o dia inteiro</span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Fuso horário (IANA)
              <input
                value={formState.timezone}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, timezone: event.target.value }))
                }
                placeholder="America/Sao_Paulo, Europe/Madrid..."
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>

            <label className="text-sm">
              País
              <input
                value={formState.country}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, country: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>

            <label className="text-sm">
              Cidade
              <input
                value={formState.city}
                onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>

            <label className="text-sm">
              Local / endereço
              <input
                value={formState.location}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, location: event.target.value }))
                }
                placeholder="Clínica matriz, hotel, coworking..."
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <label className="text-sm">
            Descrição
            <textarea
              value={formState.description}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Notas para o time / IA
            <textarea
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'Salvando...'
              : editingEntryId
                ? 'Atualizar horário'
                : 'Adicionar ao calendário'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={entryPendingDeletion !== null}
        title="Remover horário do calendário"
        description={
          entryPendingDeletion ? (
            <p>
              Confirma remover{' '}
              <span className="font-semibold text-slate-900">{entryPendingDeletion.title}</span>?
              Essa ação não pode ser desfeita e o agente não terá mais esta referência.
            </p>
          ) : null
        }
        tone="danger"
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        isConfirmLoading={isDeleting}
        onConfirm={handleDeleteEntry}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
