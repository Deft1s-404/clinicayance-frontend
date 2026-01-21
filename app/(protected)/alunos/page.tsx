'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import api from '../../../lib/api';
import { Aluno } from '../../../types';

interface AlunosApiResponse {
  data: Aluno[];
  total: number;
  page: number;
  limit: number;
}

interface AlunoFormState {
  nomeCompleto: string;
  telefone: string;
  pais: string;
  email: string;
  profissao: string;
  curso: string;
  pagamentoOk: boolean;
}

type AlunoFiltersState = {
  curso: string;
  pais: string;
  contato: string;
  nome: string;
  pagamento: 'all' | 'paid' | 'open';
};

const emptyForm: AlunoFormState = {
  nomeCompleto: '',
  telefone: '',
  pais: '',
  email: '',
  profissao: '',
  curso: '',
  pagamentoOk: false
};

const PAGE_SIZE = 50;

export default function AlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lastFetchedSearch, setLastFetchedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<AlunoFormState>({ ...emptyForm });
  const [editingAlunoId, setEditingAlunoId] = useState<string | null>(null);
  const [alunoPendingDeletion, setAlunoPendingDeletion] = useState<Aluno | null>(null);
  const [isDeletingAluno, setIsDeletingAluno] = useState(false);
  const [filters, setFilters] = useState<AlunoFiltersState>({
    curso: '',
    pais: '',
    contato: '',
    nome: '',
    pagamento: 'all'
  });
  const [lastFetchedFilters, setLastFetchedFilters] = useState<AlunoFiltersState>({
    curso: '',
    pais: '',
    contato: '',
    nome: '',
    pagamento: 'all'
  });
  const latestRequestRef = useRef(0);
  const hasFetchedInitial = useRef(false);
  const isSearchDirty = search !== lastFetchedSearch;
  const areFiltersDirty =
    filters.curso !== lastFetchedFilters.curso ||
    filters.pais !== lastFetchedFilters.pais ||
    filters.contato !== lastFetchedFilters.contato ||
    filters.nome !== lastFetchedFilters.nome ||
    filters.pagamento !== lastFetchedFilters.pagamento;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const effectivePage = Math.min(currentPage, totalPages);
  const showingFrom = total === 0 ? 0 : (effectivePage - 1) * PAGE_SIZE + 1;
  const showingTo = total === 0 ? 0 : Math.min(effectivePage * PAGE_SIZE, total);
  const canGoPrevious = effectivePage > 1;
  const canGoNext = effectivePage < totalPages && total > 0;

  const fetchAlunos = useCallback(
    async (options?: { page?: number; searchTerm?: string; filtersOverride?: AlunoFiltersState }) => {
      const pageToFetch = options?.page ?? currentPage;
      const searchTerm = options?.searchTerm ?? lastFetchedSearch;
      const filtersToUse = options?.filtersOverride ?? filters;
      const previousPage = currentPage;

      if (pageToFetch !== currentPage) {
        setCurrentPage(pageToFetch);
      }

      const requestId = ++latestRequestRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get<AlunosApiResponse>('/alunos', {
          params: {
            search: searchTerm || undefined,
            page: pageToFetch,
            limit: PAGE_SIZE,
            curso: filtersToUse.curso || undefined,
            pais: filtersToUse.pais || undefined,
            contato: filtersToUse.contato || undefined,
            nome: filtersToUse.nome || undefined,
            pagamentoOk:
              filtersToUse.pagamento === 'all'
                ? undefined
                : filtersToUse.pagamento === 'paid'
          }
        });

        if (requestId !== latestRequestRef.current) {
          return;
        }

        setAlunos(response.data.data);
        setTotal(response.data.total);
        setCurrentPage(response.data.page ?? pageToFetch);
        setLastFetchedSearch(searchTerm);
        setLastFetchedFilters({ ...filtersToUse });
      } catch (e) {
        console.error(e);
        if (requestId === latestRequestRef.current) {
          setError('Nao foi possivel carregar os alunos.');
          if (pageToFetch !== previousPage) {
            setCurrentPage(previousPage);
          }
        }
      } finally {
        if (requestId === latestRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    [currentPage, filters, lastFetchedSearch]
  );

  useEffect(() => {
    if (hasFetchedInitial.current) {
      return;
    }
    hasFetchedInitial.current = true;
    fetchAlunos();
  }, [fetchAlunos]);

  useEffect(() => {
    if (!isSearchDirty) {
      return;
    }
    fetchAlunos({ page: 1, searchTerm: search, filtersOverride: filters });
  }, [fetchAlunos, filters, isSearchDirty, search]);

  useEffect(() => {
    if (!areFiltersDirty) {
      return;
    }
    fetchAlunos({ page: 1, searchTerm: search, filtersOverride: filters });
  }, [areFiltersDirty, fetchAlunos, filters, search]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage || isLoading) {
      return;
    }
    fetchAlunos({ page, searchTerm: lastFetchedSearch });
  };

  const handlePreviousPage = () => {
    if (!canGoPrevious) {
      return;
    }
    handlePageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    if (!canGoNext) {
      return;
    }
    handlePageChange(currentPage + 1);
  };

  const handleRefresh = () => {
    const shouldResetPage = isSearchDirty || areFiltersDirty;
    const nextPage = shouldResetPage ? 1 : effectivePage;
    fetchAlunos({
      page: nextPage,
      searchTerm: isSearchDirty ? search : lastFetchedSearch,
      filtersOverride: filters
    });
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setError(null);
    setIsLoading(true);
  };

  const openModal = (aluno?: Aluno) => {
    if (aluno) {
      setEditingAlunoId(aluno.id);
      setFormState({
        nomeCompleto: aluno.nomeCompleto,
        telefone: aluno.telefone ?? '',
        pais: aluno.pais ?? '',
        email: aluno.email ?? '',
        profissao: aluno.profissao ?? '',
        curso: aluno.curso ?? '',
        pagamentoOk: aluno.pagamentoOk
      });
    } else {
      setEditingAlunoId(null);
      setFormState({ ...emptyForm });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAlunoId(null);
    setFormState({ ...emptyForm });
  };

  const handleFormChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setIsLoading(true);
  };

  const handleClearFilters = () => {
    setFilters({ curso: '', pais: '', contato: '', nome: '', pagamento: 'all' });
    setIsLoading(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      const payload = {
        nomeCompleto: formState.nomeCompleto.trim(),
        telefone: formState.telefone.trim() || undefined,
        pais: formState.pais.trim() || undefined,
        email: formState.email.trim() || undefined,
        profissao: formState.profissao.trim() || undefined,
        curso: formState.curso.trim() || undefined,
        pagamentoOk: formState.pagamentoOk
      };

      if (!payload.nomeCompleto) {
        setError('O nome completo e obrigatorio.');
        return;
      }

      if (editingAlunoId) {
        await api.patch(`/alunos/${editingAlunoId}`, payload);
      } else {
        await api.post('/alunos', payload);
      }

      closeModal();
      const shouldResetPage = isSearchDirty || areFiltersDirty;
      const nextPage = shouldResetPage ? 1 : effectivePage;
      await fetchAlunos({
        page: nextPage,
        searchTerm: isSearchDirty ? search : lastFetchedSearch,
        filtersOverride: filters
      });
    } catch (e) {
      console.error(e);
      setError('Erro ao salvar aluno.');
    }
  };

  const requestDeleteAluno = (aluno: Aluno) => {
    setAlunoPendingDeletion(aluno);
  };

  const handleConfirmDeleteAluno = async () => {
    if (!alunoPendingDeletion) {
      return;
    }
    try {
      setIsDeletingAluno(true);
      await api.delete(`/alunos/${alunoPendingDeletion.id}`);
      setAlunoPendingDeletion(null);
      const shouldResetPage = isSearchDirty || areFiltersDirty;
      const nextPage = shouldResetPage ? 1 : effectivePage;
      await fetchAlunos({
        page: nextPage,
        searchTerm: isSearchDirty ? search : lastFetchedSearch,
        filtersOverride: filters
      });
    } catch (e) {
      console.error(e);
      setError('Erro ao remover aluno.');
    } finally {
      setIsDeletingAluno(false);
    }
  };

  const handleCancelDeleteAluno = () => {
    if (isDeletingAluno) {
      return;
    }
    setAlunoPendingDeletion(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Alunos</h1>
          <p className="text-sm text-gray-500">Gerencie alunos de cursos e masterclass.</p>
        </div>

        <div className="flex gap-3">
          <input
            type="search"
            placeholder="Buscar aluno..."
            value={search}
            onChange={handleSearchChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleRefresh();
              }
            }}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Novo aluno
          </button>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl bg-white p-4 shadow md:grid-cols-5">
        <label className="text-sm">
          Curso
          <input
            type="text"
            name="curso"
            value={filters.curso}
            onChange={handleFilterChange}
            placeholder="Informe o curso"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <label className="text-sm">
          País
          <input
            type="text"
            name="pais"
            value={filters.pais}
            onChange={handleFilterChange}
            placeholder="Filtrar por país"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <label className="text-sm">
          Contato
          <input
            type="text"
            name="contato"
            value={filters.contato}
            onChange={handleFilterChange}
            placeholder="Telefone ou e-mail"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <label className="text-sm">
          Nome
          <input
            type="text"
            name="nome"
            value={filters.nome}
            onChange={handleFilterChange}
            placeholder="Filtrar por nome"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <label className="text-sm">
          Pagamento
          <select
            name="pagamento"
            value={filters.pagamento}
            onChange={handleFilterChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="paid">Pago</option>
            <option value="open">Em aberto</option>
          </select>
        </label>
        <div className="flex items-end justify-start">
          <button
            type="button"
            onClick={handleClearFilters}
            disabled={!areFiltersDirty}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">Contato</th>
              <th className="px-6 py-3">Pais</th>
              <th className="px-6 py-3">Curso</th>
              <th className="px-6 py-3">Pagamento</th>
              <th className="px-6 py-3">Profissão</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  Carregando alunos...
                </td>
              </tr>
            ) : alunos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  Nenhum aluno encontrado.
                </td>
              </tr>
            ) : (
              alunos.map((aluno) => (
                <tr key={aluno.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold">{aluno.nomeCompleto}</td>
                  <td className="px-6 py-4 text-sm">
                    <div>{aluno.email ?? '--'}</div>
                    {aluno.telefone && <div className="text-gray-400">{aluno.telefone}</div>}
                  </td>
                  <td className="px-6 py-4">{aluno.pais ?? '--'}</td>
                  <td className="px-6 py-4">{aluno.curso ?? '--'}</td>
                  <td className="px-6 py-4">
                    {aluno.pagamentoOk ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-600">
                        Pago
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-500">
                        Em aberto
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">{aluno.profissao ?? '--'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openModal(aluno)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteAluno(aluno)}
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

      <div className="flex flex-col items-start justify-between gap-3 border-t border-gray-100 pt-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:text-sm">
        <p>
          {isLoading
            ? 'Carregando alunos...'
            : total > 0
            ? `Exibindo ${showingFrom}-${showingTo} de ${total} registros`
            : lastFetchedSearch
            ? `Nenhum resultado para \"${lastFetchedSearch}\".`
            : 'Nenhum registro encontrado'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreviousPage}
            disabled={!canGoPrevious || isLoading}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="font-medium text-gray-600">
            Pagina {total > 0 ? effectivePage : 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={!canGoNext || isLoading}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Proxima
          </button>
        </div>
      </div>

      <Modal title={editingAlunoId ? 'Editar aluno' : 'Novo aluno'} isOpen={isModalOpen} onClose={closeModal}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block text-sm md:col-span-2">
            Nome completo
            <input
              type="text"
              name="nomeCompleto"
              value={formState.nomeCompleto}
              onChange={handleFormChange}
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            E-mail
            <input
              type="email"
              name="email"
              value={formState.email}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Telefone
            <input
              type="text"
              name="telefone"
              value={formState.telefone}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            País
            <input
              type="text"
              name="pais"
              value={formState.pais}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Profissão
            <input
              type="text"
              name="profissao"
              value={formState.profissao}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            Curso matriculado
            <input
              type="text"
              name="curso"
              value={formState.curso}
              onChange={handleFormChange}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="pagamentoOk"
              checked={formState.pagamentoOk}
              onChange={handleFormChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Pagamento confirmado
          </label>

          {error && (
            <p className="md:col-span-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              {editingAlunoId ? 'Salvar alteracoes' : 'Criar aluno'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={alunoPendingDeletion !== null}
        title="Remover aluno"
        description={
          alunoPendingDeletion ? (
            <p>
              Deseja realmente remover{' '}
              <span className="font-semibold text-slate-900">{alunoPendingDeletion.nomeCompleto}</span>? Essa ação não
              pode ser desfeita.
            </p>
          ) : null
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirmLoading={isDeletingAluno}
        onCancel={handleCancelDeleteAluno}
        onConfirm={handleConfirmDeleteAluno}
      />
    </div>
  );
}
