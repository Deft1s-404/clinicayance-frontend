'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import api from '../../../lib/api';
import { ServiceOffering } from '../../../types';

interface ServiceOfferingsResponse {
  data: ServiceOffering[];
  total: number;
}

interface ServiceFormState {
  name: string;
  description: string;
  category: string;
  country: string;
  currency: string;
  price: string;
  durationMinutes: string;
  notes: string;
  active: boolean;
}

const defaultFormState: ServiceFormState = {
  name: '',
  description: '',
  category: '',
  country: '',
  currency: 'USD',
  price: '',
  durationMinutes: '',
  notes: '',
  active: true
};

const countryOptions = [
  { label: 'Brasil', value: 'Brasil' },
  { label: 'Panama', value: 'Panama' },
  { label: 'Colombia', value: 'Colombia' }
];

const currencyOptions = [
  { label: 'Brasil (BRL)', value: 'BRL' },
  { label: 'Colombia (COP)', value: 'COP' },
  { label: 'Panama (USD)', value: 'USD' }
];

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency ?? 'USD'}`;
  }
};

const formatDuration = (minutes?: number | null) => {
  if (!minutes) {
    return '--';
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
};

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<ServiceFormState>(defaultFormState);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [servicePendingDeletion, setServicePendingDeletion] = useState<ServiceOffering | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit || 1)), [total, limit]);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<ServiceOfferingsResponse>('/services', {
        params: {
          page,
          limit,
          search: searchQuery || undefined,
          country: countryFilter || undefined,
          category: categoryFilter || undefined,
          onlyActive: onlyActive || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined
        }
      });
      setServices(response.data.data);
      setTotal(response.data.total);
    } catch (e) {
      console.error(e);
      setError('Nao foi possivel carregar a tabela de precos.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchQuery, countryFilter, categoryFilter, onlyActive, minPrice, maxPrice]);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const handleSearch = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingServiceId(null);
  };

  const openModal = (service?: ServiceOffering) => {
    if (service) {
      setEditingServiceId(service.id);
      setFormState({
        name: service.name,
        description: service.description ?? '',
        category: service.category ?? '',
        country: service.country ?? '',
        currency: service.currency,
        price: String(service.price),
        durationMinutes: service.durationMinutes ? String(service.durationMinutes) : '',
        notes: service.notes ?? '',
        active: service.active
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

  const buildPayload = () => {
    const normalizedPrice = formState.price.replace(',', '.');
    const parsedPrice = parseFloat(normalizedPrice);

    const payload: Record<string, unknown> = {
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      category: formState.category.trim() || undefined,
      country: formState.country.trim() || undefined,
      currency: formState.currency.trim() || 'USD',
      price: parsedPrice,
      durationMinutes: formState.durationMinutes ? Number(formState.durationMinutes) : undefined,
      notes: formState.notes.trim() || undefined,
      active: formState.active
    };

    if (Number.isNaN(parsedPrice)) {
      throw new Error('Preco invalido');
    }

    return payload;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      const payload = buildPayload();
      if (editingServiceId) {
        await api.patch(`/services/${editingServiceId}`, payload);
      } else {
        await api.post('/services', payload);
      }
      closeModal();
      setPage(1);
      await fetchServices();
    } catch (e: any) {
      console.error(e);
      const message =
        e instanceof Error
          ? e.message
          : (e?.response?.data?.message as string | undefined) ?? 'Erro ao salvar servico.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteService = (service: ServiceOffering) => {
    setServicePendingDeletion(service);
  };

  const handleDeleteService = async () => {
    if (!servicePendingDeletion) {
      return;
    }
    try {
      setIsDeleting(true);
      setError(null);
      await api.delete(`/services/${servicePendingDeletion.id}`);
      setServicePendingDeletion(null);
      await fetchServices();
    } catch (e) {
      console.error(e);
      setError('Erro ao remover servico.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (!isDeleting) {
      setServicePendingDeletion(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Tabela de precos</h1>
          <p className="text-sm text-gray-500">
            Cadastre os servicos oferecidos por pais e moeda para que o agente de IA consulte valores atualizados.
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
                {size} por pagina
              </option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Novo servico
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
                  handleSearch();
                }
              }}
              placeholder="Nome, pais, observacoes..."
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
          Pais
          <input
            value={countryFilter}
            onChange={(event) => {
              setCountryFilter(event.target.value);
              setPage(1);
            }}
            placeholder="Brasil, Panama..."
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold uppercase text-gray-500">
          Categoria
          <input
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setPage(1);
            }}
            placeholder="Estetica, telemedicina..."
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold uppercase text-gray-500">
          Preco minimo
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(event) => {
              setMinPrice(event.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold uppercase text-gray-500">
          Preco maximo
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(event) => {
              setMaxPrice(event.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold uppercase text-gray-500 md:col-span-2">
          Status
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <input
              id="onlyActive"
              type="checkbox"
              checked={onlyActive}
              onChange={(event) => {
                setOnlyActive(event.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="onlyActive" className="text-sm text-gray-700">
              Mostrar apenas servicos ativos
            </label>
          </div>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="rounded-2xl bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Servico</th>
              <th className="px-6 py-3">Localizacao</th>
              <th className="px-6 py-3">Preco</th>
              <th className="px-6 py-3">Duracao</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                  Nenhum servico encontrado para os filtros atuais.
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{service.name}</p>
                    {(service.description || service.notes) && (
                      <p className="text-xs text-gray-400">
                        {[service.description, service.notes].filter(Boolean).join(' | ')}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p>{service.country ?? '--'}</p>
                    <p className="text-xs text-gray-400">{service.category ?? 'Sem categoria'}</p>
                  </td>
                  <td className="px-6 py-4 font-semibold text-primary">
                    {formatCurrency(service.price, service.currency)}
                  </td>
                  <td className="px-6 py-4">{formatDuration(service.durationMinutes)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        service.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {service.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(service)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => requestDeleteService(service)}
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
            ? 'Carregando servicos...'
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
            Pagina {Math.min(page, totalPages)} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => canGoNext && setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={!canGoNext || isLoading}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Proxima
          </button>
        </div>
      </div>

      <Modal
        title={editingServiceId ? 'Atualizar servico' : 'Novo servico'}
        isOpen={isModalOpen}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit} className="grid gap-4 text-sm">
          <label>
            Nome
            <input
              required
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Descricao
            <textarea
              value={formState.description}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Categoria
            <input
              value={formState.category}
              onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Pais
            <select
              value={formState.country}
              onChange={(event) => setFormState((prev) => ({ ...prev, country: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="">Selecione um pais</option>
              {countryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Moeda
            <select
              value={formState.currency}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, currency: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Preco
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={formState.price}
              onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Duracao (minutos)
            <input
              type="number"
              min="0"
              value={formState.durationMinutes}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, durationMinutes: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label>
            Notas
            <textarea
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <input
              type="checkbox"
              checked={formState.active}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, active: event.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>Servico ativo</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Salvando...' : editingServiceId ? 'Atualizar' : 'Adicionar'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={servicePendingDeletion !== null}
        title="Remover servico"
        description={
          servicePendingDeletion ? (
            <p>
              Deseja remover <span className="font-semibold text-slate-900">{servicePendingDeletion.name}</span> da tabela?
            </p>
          ) : null
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirmLoading={isDeleting}
        onConfirm={handleDeleteService}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
