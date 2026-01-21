'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import api from '../../../lib/api';
import { KnowledgeEntry, KnowledgeEntryStatus } from '../../../types';

interface KnowledgeEntriesResponse {
  data: KnowledgeEntry[];
  total: number;
  page: number;
  limit: number;
}

interface KnowledgeFormState {
  title: string;
  slug: string;
  summary: string;
  content: string;
  tags: string;
  category: string;
  audience: string;
  language: string;
  priority: string;
  status: KnowledgeEntryStatus;
  sourceUrl: string;
}

const defaultFormState: KnowledgeFormState = {
  title: '',
  slug: '',
  summary: '',
  content: '',
  tags: '',
  category: '',
  audience: '',
  language: 'pt-BR',
  priority: '0',
  status: 'DRAFT',
  sourceUrl: ''
};

const statusOptions: { value: KnowledgeEntryStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'ARCHIVED', label: 'Arquivado' }
];

const statusLabels: Record<KnowledgeEntryStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado'
};

const statusClasses: Record<KnowledgeEntryStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  ARCHIVED: 'bg-orange-100 text-orange-700'
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '--';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const parseTags = (input: string) =>
  input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [formState, setFormState] = useState<KnowledgeFormState>(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryPendingDeletion, setEntryPendingDeletion] = useState<KnowledgeEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit || 1)), [total, limit]);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const fetchEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<KnowledgeEntriesResponse>('/knowledge', {
        params: {
          page,
          limit
        }
      });
      setEntries(response.data.data);
      setTotal(response.data.total);
    } catch (e) {
      console.error(e);
      setError('Não foi possível carregar as anotações.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingEntry(null);
  };

  const openModal = (entry?: KnowledgeEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormState({
        title: entry.title,
        slug: entry.slug ?? '',
        summary: entry.summary ?? '',
        content: entry.content,
        tags: entry.tags?.join(', ') ?? '',
        category: entry.category ?? '',
        audience: entry.audience ?? '',
        language: entry.language ?? '',
        priority: String(entry.priority ?? 0),
        status: entry.status,
        sourceUrl: entry.sourceUrl ?? ''
      });
    } else {
      resetForm();
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsSubmitting(false);
    resetForm();
  };

  const buildPayload = () => {
    const priorityValue = Number(formState.priority);
    if (Number.isNaN(priorityValue)) {
      throw new Error('Prioridade inválida.');
    }

    if (!formState.content.trim()) {
      throw new Error('O conteúdo é obrigatório.');
    }

    return {
      title: formState.title.trim(),
      slug: formState.slug.trim() || undefined,
      summary: formState.summary.trim() || undefined,
      content: formState.content.trim(),
      tags: parseTags(formState.tags),
      category: formState.category.trim() || undefined,
      audience: formState.audience.trim() || undefined,
      language: formState.language.trim() || undefined,
      status: formState.status,
      priority: priorityValue,
      sourceUrl: formState.sourceUrl.trim() || undefined
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      const payload = buildPayload();
      if (editingEntry) {
        await api.patch(`/knowledge/${editingEntry.id}`, payload);
      } else {
        await api.post('/knowledge', payload);
      }
      closeModal();
      setPage(1);
      await fetchEntries();
    } catch (e: any) {
      console.error(e);
      const message =
        e instanceof Error
          ? e.message
          : (e?.response?.data?.message as string | undefined) ?? 'Erro ao salvar texto.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeletion = (entry: KnowledgeEntry) => {
    setEntryPendingDeletion(entry);
  };

  const handleDelete = async () => {
    if (!entryPendingDeletion) return;
    try {
      setIsDeleting(true);
      setError(null);
      await api.delete(`/knowledge/${entryPendingDeletion.id}`);
      setEntryPendingDeletion(null);
      await fetchEntries();
    } catch (e) {
      console.error(e);
      setError('Não foi possível remover o registro.');
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
          <h1 className="text-3xl font-semibold text-slate-900">Base de conhecimento</h1>
          <p className="text-sm text-gray-500">
            Centralize instruções e contextos que o n8n consulta via <span className="font-mono text-xs">GET /ai/knowledge/context</span>.
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
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} por página
              </option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Novo texto
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Título</th>
              <th className="px-6 py-3">Tags</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Atualizado</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                  Nenhum texto encontrado para os filtros atuais.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{entry.title}</p>
                    <p className="text-xs text-gray-500">
                      {entry.summary
                        ? entry.summary
                        : entry.content.slice(0, 140).concat(entry.content.length > 140 ? '…' : '')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {entry.tags?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Sem tags</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[entry.status]}`}>
                      {statusLabels[entry.status]}
                    </span>
                    <p className="mt-1 text-xs text-gray-400">Prioridade {entry.priority}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900">{formatDate(entry.updatedAt)}</p>
                    <p className="text-xs text-gray-400">
                      {entry.status === 'PUBLISHED' ? `Publicado em ${formatDate(entry.publishedAt)}` : 'Não publicado'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(entry)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => requestDeletion(entry)}
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
            ? 'Carregando...'
            : total > 0
            ? `Exibindo ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} de ${total}`
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
        title={editingEntry ? 'Atualizar texto' : 'Novo texto para o agente'}
        isOpen={isModalOpen}
        onClose={closeModal}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="grid gap-4 text-sm">
          <label>
            Título
            <input
              required
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Slug (opcional)
            <input
              value={formState.slug}
              onChange={(event) => setFormState((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="checklist-rh"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Resumo
            <textarea
              value={formState.summary}
              rows={2}
              onChange={(event) => setFormState((prev) => ({ ...prev, summary: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Tags (separadas por vírgula)
            <input
              value={formState.tags}
              onChange={(event) => setFormState((prev) => ({ ...prev, tags: event.target.value }))}
              placeholder="crm,faq,triagem"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label>
              Categoria
              <input
                value={formState.category}
                onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>

          <label>
            Audiência
            <input
              value={formState.audience}
              onChange={(event) => setFormState((prev) => ({ ...prev, audience: event.target.value }))}
              placeholder="agente, paciente..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Linguagem
            <input
              value={formState.language}
              onChange={(event) => setFormState((prev) => ({ ...prev, language: event.target.value }))}
              placeholder="pt-BR"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label>
              Status
              <select
                value={formState.status}
                onChange={(event) =>
                setFormState((prev) => ({ ...prev, status: event.target.value as KnowledgeEntryStatus }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Prioridade
            <input
              type="number"
              value={formState.priority}
              onChange={(event) => setFormState((prev) => ({ ...prev, priority: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Fonte (URL)
            <input
              value={formState.sourceUrl}
              onChange={(event) => setFormState((prev) => ({ ...prev, sourceUrl: event.target.value }))}
              placeholder="https://docs..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>
          </div>

          <label>
            Conteúdo
            <textarea
              required
              rows={10}
              value={formState.content}
              onChange={(event) => setFormState((prev) => ({ ...prev, content: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Salvando...' : editingEntry ? 'Atualizar' : 'Adicionar'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={entryPendingDeletion !== null}
        title="Remover texto"
        description={
          entryPendingDeletion ? (
            <p>
              Deseja remover{' '}
              <span className="font-semibold text-slate-900">{entryPendingDeletion.title}</span>?
            </p>
          ) : null
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirmLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={handleCancelDelete}
      />

    </div>
  );
}
