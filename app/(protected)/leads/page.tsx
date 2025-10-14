'use client';

import { FormEvent, useEffect, useState } from 'react';

import { Modal } from '../../../components/Modal';
import { StatusBadge } from '../../../components/StatusBadge';
import api from '../../../lib/api';
import { Client, Lead } from '../../../types';

type LeadStageOption = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';

interface LeadsResponse {
  data: Lead[];
  total: number;
}

interface ClientsResponse {
  data: Client[];
}

const stageOptions: LeadStageOption[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState({
    clientId: '',
    source: '',
    notes: '',
    stage: 'NEW'
  });
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);

  const fetchLeads = async (stageFilter?: string) => {
    try {
      setIsLoading(true);
      const response = await api.get<LeadsResponse>('/leads', {
        params: { limit: 100, stage: stageFilter }
      });
      setLeads(response.data.data);
      setTotal(response.data.total);
    } catch (e) {
      console.error(e);
      setError('Não foi possível carregar os leads.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get<ClientsResponse>('/clients', { params: { limit: 100 } });
      setClients(response.data.data);
    } catch (e) {
      console.error('Erro ao buscar clientes', e);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchClients();
  }, []);

  const openModal = (lead?: Lead) => {
    if (lead) {
      setEditingLeadId(lead.id);
      setFormState({
        clientId: lead.clientId,
        source: lead.source ?? '',
        notes: lead.notes ?? '',
        stage: lead.stage
      });
    } else {
      setEditingLeadId(null);
      setFormState({
        clientId: '',
        source: '',
        notes: '',
        stage: 'NEW'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (editingLeadId) {
        await api.patch(`/leads/${editingLeadId}`, formState);
      } else {
        await api.post('/leads', formState);
      }
      setIsModalOpen(false);
      await fetchLeads(selectedStage);
    } catch (e) {
      console.error(e);
      setError('Erro ao salvar lead.');
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!window.confirm('Deseja realmente excluir esse lead?')) {
      return;
    }
    try {
      await api.delete(`/leads/${leadId}`);
      await fetchLeads(selectedStage);
    } catch (e) {
      console.error(e);
      setError('Erro ao remover lead.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Leads e Funil</h1>
          <p className="text-sm text-gray-500">Controle o funil comercial e qualifique os leads.</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedStage}
            onChange={(event) => {
              const stage = event.target.value;
              setSelectedStage(stage);
              fetchLeads(stage || undefined);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Todos os estágios</option>
            {stageOptions.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Novo Lead
          </button>
        </div>
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
              <th className="px-6 py-3">Origem</th>
              <th className="px-6 py-3">Notas</th>
              <th className="px-6 py-3">Estágio</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                  Nenhum lead encontrado.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{lead.client?.name}</p>
                    <p className="text-xs text-gray-400">{lead.client?.email}</p>
                  </td>
                  <td className="px-6 py-4">{lead.source ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{lead.notes ?? '—'}</td>
                  <td className="px-6 py-4">
                    <StatusBadge value={lead.stage} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(lead)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Atualizar
                      </button>
                      <button
                        onClick={() => handleDelete(lead.id)}
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

      <p className="text-xs text-gray-400">Total de leads: {total}</p>

      <Modal
        title={editingLeadId ? 'Atualizar lead' : 'Novo lead'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="text-sm">
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
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Origem
            <input
              value={formState.source}
              onChange={(event) => setFormState((prev) => ({ ...prev, source: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Estágio
            <select
              value={formState.stage}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, stage: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              {stageOptions.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Notas
            <textarea
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              rows={3}
            />
          </label>

          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark"
          >
            Salvar lead
          </button>
        </form>
      </Modal>
    </div>
  );
}
