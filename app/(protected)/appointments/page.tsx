'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import { StatusBadge } from '../../../components/StatusBadge';
import api from '../../../lib/api';
import { Appointment, AppointmentType, Client } from '../../../types';

type AppointmentStatusOption = 'BOOKED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface AppointmentsResponse {
  data: Appointment[];
  total: number;
}

interface ClientsResponse {
  data: Client[];
}

const statusOptions: AppointmentStatusOption[] = ['BOOKED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const statusLabels: Record<AppointmentStatusOption, string> = {
  BOOKED: 'Agendada',
  COMPLETED: 'Concluida',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'Não compareceu'
};

const countryOptions = ['Brasil', 'Colombia', 'Panamá', 'França'];
const appointmentTypeOptions: { value: AppointmentType; label: string }[] = [
  { value: 'IN_PERSON', label: 'Presencial' },
  { value: 'ONLINE', label: 'Online' }
];
const appointmentTypeLabels: Record<AppointmentType, string> = {
  IN_PERSON: 'Presencial',
  ONLINE: 'Online'
};

interface AppointmentFormState {
  clientId: string;
  procedure: string;
  country: string;
  type: AppointmentType;
  meetingLink: string;
  start: string;
  end: string;
  status: AppointmentStatusOption;
}

const initialFormState: AppointmentFormState = {
  clientId: '',
  procedure: '',
  country: countryOptions[0],
  type: 'IN_PERSON',
  meetingLink: '',
  start: '',
  end: '',
  status: 'BOOKED'
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [isClientsLoading, setIsClientsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startFilter, setStartFilter] = useState('');
  const [endFilter, setEndFilter] = useState('');
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [formState, setFormState] = useState<AppointmentFormState>({ ...initialFormState });
  const [appointmentPendingDeletion, setAppointmentPendingDeletion] = useState<Appointment | null>(null);
  const [isDeletingAppointment, setIsDeletingAppointment] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: Record<string, unknown> = { limit: 100 };
      if (selectedStatus) {
        params.status = selectedStatus;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      if (startFilter) {
        const parsed = new Date(startFilter);
        params.start = Number.isNaN(parsed.getTime()) ? startFilter : parsed.toISOString();
      }
      if (endFilter) {
        const parsed = new Date(endFilter);
        params.end = Number.isNaN(parsed.getTime()) ? endFilter : parsed.toISOString();
      }
      const response = await api.get<AppointmentsResponse>('/appointments', { params });
      setAppointments(response.data.data);
      setTotal(response.data.total);
    } catch (e) {
      console.error(e);
      setError('Nao foi possivel carregar os agendamentos.');
    } finally {
      setIsLoading(false);
    }
  }, [endFilter, searchQuery, selectedStatus, startFilter]);

  const fetchClients = async (searchTerm?: string) => {
    try {
      setIsClientsLoading(true);
      const response = await api.get<ClientsResponse>('/clients', {
        params: { limit: 50, search: searchTerm || undefined }
      });
      setClients(response.data.data);
    } catch (e) {
      console.error('Erro ao buscar clientes', e);
    } finally {
      setIsClientsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchClients();
  }, []);

  // Converts an ISO date string to a value suitable for a `datetime-local` input (local time, YYYY-MM-DDTHH:mm)
  const isoToLocalInput = (iso: string) => {
    const d = new Date(iso);
    // Adjust by timezone offset so that toISOString() yields local components
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const normalizeStatusValue = (value: string): AppointmentStatusOption => {
    return statusOptions.includes(value as AppointmentStatusOption) ? (value as AppointmentStatusOption) : 'BOOKED';
  };

  const openModal = (appointment?: Appointment) => {
    if (appointment) {
      setEditingAppointmentId(appointment.id);
      setFormState({
        clientId: appointment.clientId,
        procedure: appointment.procedure,
        country: appointment.country ?? countryOptions[0],
        type: appointment.type ?? 'IN_PERSON',
        meetingLink: appointment.meetingLink ?? '',
        // appointment.start/end come as ISO strings (UTC). Convert to local string for the input.
        start: isoToLocalInput(appointment.start),
        end: isoToLocalInput(appointment.end),
        status: normalizeStatusValue(appointment.status)
      });
    } else {
      setEditingAppointmentId(null);
      setFormState({ ...initialFormState });
    }
    void fetchClients(clientSearch.trim() || undefined);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = {
        ...formState,
        meetingLink: formState.meetingLink.trim() ? formState.meetingLink.trim() : undefined,
        country: formState.country || countryOptions[0],
        start: new Date(formState.start).toISOString(),
        end: new Date(formState.end).toISOString()
      };

      if (editingAppointmentId) {
        await api.patch(`/appointments/${editingAppointmentId}`, payload);
      } else {
        await api.post('/appointments', payload);
      }
      setIsModalOpen(false);
      await fetchAppointments();
    } catch (e) {
      console.error(e);
      setError('Erro ao salvar agendamento.');
    }
  };

  const requestDeleteAppointment = (appointment: Appointment) => {
    setAppointmentPendingDeletion(appointment);
  };

  const handleConfirmDeleteAppointment = async () => {
    if (!appointmentPendingDeletion) {
      return;
    }
    try {
      setIsDeletingAppointment(true);
      await api.delete(`/appointments/${appointmentPendingDeletion.id}`);
      setAppointmentPendingDeletion(null);
      await fetchAppointments();
    } catch (e) {
      console.error(e);
      setError('Erro ao remover consulta.');
    } finally {
      setIsDeletingAppointment(false);
    }
  };

  const handleCancelDeleteAppointment = () => {
    if (isDeletingAppointment) {
      return;
    }
    setAppointmentPendingDeletion(null);
  };

  const handleClientSearch = async () => {
    await fetchClients(clientSearch.trim() || undefined);
  };

  const handleFiltersSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Consultas</h1>
          <p className="text-sm text-gray-500">Acompanhe agendamentos, status e histórico.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Nova consulta
        </button>
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
                  handleFiltersSearch();
                }
              }}
              placeholder="Nome ou contato (email/telefone)..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleFiltersSearch}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Buscar
            </button>
          </div>
        </label>

        <label className="text-xs font-semibold uppercase text-gray-500">
          Status
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Todos</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase text-gray-500">
          Início (de)
          <input
            type="datetime-local"
            value={startFilter}
            onChange={(event) => setStartFilter(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold uppercase text-gray-500">
          Início (até)
          <input
            type="datetime-local"
            value={endFilter}
            onChange={(event) => setEndFilter(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Procedimento</th>
                <th className="px-6 py-3">Pais</th>
                <th className="px-6 py-3">Início</th>
              <th className="px-6 py-3">Fim</th>
              <th className="px-6 py-3">Tipo</th>
              <th className="px-6 py-3">Link</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-6 py-6 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-6 text-center text-gray-500">
                  Nenhuma consulta encontrada.
                </td>
              </tr>
            ) : (
              appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{appointment.client.name}</p>
                    <p className="text-xs text-gray-400">{appointment.client.email}</p>
                    {appointment.client.phone && (
                      <p className="text-xs text-gray-400">{appointment.client.phone}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">{appointment.procedure}</td>
                  <td className="px-6 py-4">{appointment.country ?? '-'}</td>
                  <td className="px-6 py-4">{formatDateTime(appointment.start)}</td>
                  <td className="px-6 py-4">{formatDateTime(appointment.end)}</td>
                  <td className="px-6 py-4">
                    {appointmentTypeLabels[(appointment.type ?? 'IN_PERSON') as AppointmentType]}
                  </td>
                  <td className="px-6 py-4">
                    {appointment.meetingLink ? (
                      <a
                        href={appointment.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        Abrir link
                      </a>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge value={appointment.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(appointment)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Atualizar
                      </button>
                      <button
                        onClick={() => requestDeleteAppointment(appointment)}
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

      <p className="text-xs text-gray-400">Total de consultas: {total}</p>

      <Modal
        title={editingAppointmentId ? 'Atualizar consulta' : 'Nova consulta'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-2 text-sm">
            <label className="block">
              Buscar cliente
              <div className="mt-1 flex gap-2">
                <input
                  type="search"
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleClientSearch();
                    }
                  }}
                  placeholder="Digite o nome do cliente"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleClientSearch}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                >
                  Buscar
                </button>
              </div>
            </label>

            <label className="block">
              Cliente
              <select
                required
                value={formState.clientId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, clientId: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              >
                <option value="">Selecione um cliente</option>
                {isClientsLoading ? (
                  <option disabled>Carregando clientes...</option>
                ) : clients.length === 0 ? (
                  <option disabled>Nenhum cliente encontrado</option>
                ) : (
                  clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          <label className="text-sm">
            Procedimento
            <input
              required
              value={formState.procedure}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, procedure: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            País
            <select
              required
              value={formState.country}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, country: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Tipo de consulta
            <select
              value={formState.type}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  type: event.target.value as AppointmentType,
                  meetingLink: event.target.value === 'ONLINE' ? prev.meetingLink : ''
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              {appointmentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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

          {formState.type === 'ONLINE' && (
            <label className="text-sm md:col-span-2">
              Link da consulta (Google Meet)
              <input
                type="url"
                required
                value={formState.meetingLink}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, meetingLink: event.target.value }))
                }
                placeholder="https://meet.google.com/..."
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>
          )}

          <label className="text-sm md:col-span-2">
            Status
            <select
              value={formState.status}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  status: event.target.value as AppointmentStatusOption
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark"
            >
              Salvar consulta
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={appointmentPendingDeletion !== null}
        title="Remover consulta"
        description={
          appointmentPendingDeletion ? (
            <p>
              Deseja realmente remover a consulta de{' '}
              <span className="font-semibold text-slate-900">{appointmentPendingDeletion.client.name}</span>?
              Essa acao nao pode ser desfeita.
            </p>
          ) : null
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirmLoading={isDeletingAppointment}
        onCancel={handleCancelDeleteAppointment}
        onConfirm={handleConfirmDeleteAppointment}
      />
    </div>
  );
}
