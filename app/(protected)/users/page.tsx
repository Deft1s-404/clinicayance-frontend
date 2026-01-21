'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Loading } from '../../../components/Loading';
import { Modal } from '../../../components/Modal';
import { useAuth } from '../../../hooks/useAuth';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import api from '../../../lib/api';
import { User } from '../../../types';

type ManagedUser = User & {
  createdAt?: string;
  updatedAt?: string;
};

interface UsersApiResponse {
  data: ManagedUser[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 20;

const buildEmptyFormState = () => ({
  name: '',
  email: '',
  role: 'USER',
  password: ''
});

const formatDate = (value?: string) => {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleDateString('pt-BR');
};

const getRoleLabel = (role: string) => (role?.toUpperCase() === 'ADMIN' ? 'Administrador' : 'Usuario');

export default function UsersPage() {
  const { isAuthorized, loading: authLoading } = useRoleGuard(['ADMIN']);
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [lastFetchedSearch, setLastFetchedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState(buildEmptyFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasLoadedRef = useRef(false);

  const isSearchDirty = search !== lastFetchedSearch;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages && total > 0;

  const fetchUsers = useCallback(
    async (options?: { page?: number; searchTerm?: string }) => {
      const pageToFetch = options?.page ?? page;
      const searchTerm = options?.searchTerm ?? lastFetchedSearch;
      const previousPage = page;
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<UsersApiResponse>('/users', {
          params: {
            page: pageToFetch,
            limit: PAGE_SIZE,
            search: searchTerm || undefined
          }
        });
        setUsers(response.data.data ?? []);
        setTotal(response.data.total ?? 0);
        setPage(response.data.page ?? pageToFetch);
        setLastFetchedSearch(searchTerm);
      } catch (err) {
        console.error(err);
        setUsers([]);
        setError('Nao foi possivel carregar os usuarios.');
        if (pageToFetch !== previousPage) {
          setPage(previousPage);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [lastFetchedSearch, page]
  );

  useEffect(() => {
    if (authLoading || !isAuthorized) {
      return;
    }
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;
    fetchUsers({ page: 1, searchTerm: '' });
  }, [authLoading, fetchUsers, isAuthorized]);

  useEffect(() => {
    if (authLoading || !isAuthorized) {
      return;
    }
    if (!isSearchDirty) {
      return;
    }
    const handle = window.setTimeout(() => {
      fetchUsers({ page: 1, searchTerm: search });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [authLoading, fetchUsers, isAuthorized, isSearchDirty, search]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page || isLoading) {
      return;
    }
    fetchUsers({ page: nextPage, searchTerm: lastFetchedSearch });
  };

  const handleRefresh = () => {
    const targetSearch = isSearchDirty ? search : lastFetchedSearch;
    const nextPage = isSearchDirty ? 1 : page;
    fetchUsers({ page: nextPage, searchTerm: targetSearch });
  };

  const openModal = (user?: ManagedUser) => {
    setFormError(null);
    if (user) {
      setEditingUserId(user.id);
      setFormState({
        name: user.name,
        email: user.email,
        role: user.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER',
        password: ''
      });
    } else {
      setEditingUserId(null);
      setFormState(buildEmptyFormState());
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }
    setIsModalOpen(false);
    setFormError(null);
    setFormState(buildEmptyFormState());
    setEditingUserId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const effectiveSearch = isSearchDirty ? search : lastFetchedSearch;

    const payload: Record<string, unknown> = {
      name: formState.name.trim(),
      email: formState.email.trim().toLowerCase(),
      role: formState.role
    };

    if (editingUserId) {
      if (formState.password.trim()) {
        payload.password = formState.password.trim();
      }
    } else {
      payload.password = formState.password.trim();
    }

    setIsSubmitting(true);
    try {
      if (editingUserId) {
        await api.patch(`/users/${editingUserId}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setIsModalOpen(false);
      setFormState(buildEmptyFormState());
      setEditingUserId(null);
      await fetchUsers({
        page: editingUserId ? page : 1,
        searchTerm: editingUserId ? lastFetchedSearch : effectiveSearch
      });
    } catch (err) {
      console.error(err);
      setFormError('Nao foi possivel salvar o usuario. Verifique os dados e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDelete = (user: ManagedUser) => {
    if (currentUser?.id === user.id) {
      setError('Nao e possivel remover o proprio usuario.');
      return;
    }
    setPendingDeletion(user);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeletion) {
      return;
    }
    const effectiveSearch = isSearchDirty ? search : lastFetchedSearch;
    setIsDeleting(true);
    try {
      await api.delete(`/users/${pendingDeletion.id}`);
      setPendingDeletion(null);
      await fetchUsers({ page, searchTerm: effectiveSearch });
    } catch (err) {
      console.error(err);
      setError('Erro ao remover usuario. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (isDeleting) {
      return;
    }
    setPendingDeletion(null);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loading />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const isEditingSelf = editingUserId !== null && editingUserId === currentUser?.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Usuarios</h1>
          <p className="text-sm text-gray-500">Gerencie quem pode acessar o CRM e defina perfis de acesso.</p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Novo usuario
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl bg-white p-4 shadow md:grid-cols-3">
        <label className="text-xs font-semibold uppercase text-gray-500 md:col-span-2">
          Busca por nome ou email
          <div className="mt-1 flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleRefresh();
                }
              }}
              placeholder="Digite para filtrar usuarios..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Buscar
            </button>
          </div>
        </label>

        <div className="text-xs font-semibold uppercase text-gray-500">
          Acoes rapidas
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Atualizar lista
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Perfil</th>
              <th className="px-6 py-3">Criado em</th>
              <th className="px-6 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  Carregando usuarios...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  {lastFetchedSearch
                    ? `Nenhum usuario encontrado para "${lastFetchedSearch}".`
                    : 'Nenhum usuario cadastrado ate o momento.'}
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isAdmin = user.role?.toUpperCase() === 'ADMIN';
                const isSelf = currentUser?.id === user.id;
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <p>{user.name}</p>
                      {isSelf && <p className="text-xs font-normal text-primary">Voce</p>}
                    </td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          isAdmin ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openModal(user)}
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                        >
                          Editar
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => requestDelete(user)}
                            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 border-t border-gray-100 pt-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:text-sm">
        <p>
          {isLoading
            ? 'Carregando usuarios...'
            : total > 0
            ? `Exibindo ${showingFrom}-${showingTo} de ${total} registros`
            : lastFetchedSearch
            ? `Nenhum usuario encontrado para "${lastFetchedSearch}".`
            : 'Nenhum registro encontrado.'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={!canGoPrevious || isLoading}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="font-medium text-gray-600">
            Pagina {total > 0 ? page : 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={!canGoNext || isLoading}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Proxima
          </button>
        </div>
      </div>

      <Modal
        title={editingUserId ? 'Atualizar usuario' : 'Novo usuario'}
        isOpen={isModalOpen}
        onClose={closeModal}
        size="md"
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {formError}
            </div>
          )}

          <label className="text-sm font-semibold text-gray-700">
            Nome completo
            <input
              type="text"
              required
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Email
            <input
              type="email"
              required
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Perfil
            <select
              value={formState.role}
              onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              disabled={isEditingSelf}
            >
              <option value="USER">Usuario</option>
              <option value="ADMIN">Administrador</option>
            </select>
            {isEditingSelf && (
              <p className="mt-1 text-xs text-gray-500">Para manter o acesso completo, nao e possivel alterar o proprio perfil.</p>
            )}
          </label>

          <label className="text-sm font-semibold text-gray-700">
            {editingUserId ? 'Nova senha (opcional)' : 'Senha inicial'}
            <input
              type="password"
              value={formState.password}
              onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
              placeholder={editingUserId ? 'Deixe em branco para manter' : undefined}
              minLength={6}
              required={!editingUserId}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSubmitting ? 'Salvando...' : editingUserId ? 'Atualizar usuario' : 'Criar usuario'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={pendingDeletion !== null}
        title="Remover usuario"
        description={
          pendingDeletion ? (
            <p>
              Deseja realmente remover{' '}
              <span className="font-semibold text-slate-900">{pendingDeletion.name}</span>? Essa acao nao pode ser
              desfeita.
            </p>
          ) : undefined
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isConfirmLoading={isDeleting}
        tone="danger"
      />
    </div>
  );
}
