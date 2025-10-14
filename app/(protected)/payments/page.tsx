'use client';

import { FormEvent, useEffect, useState } from 'react';

import { Modal } from '../../../components/Modal';
import { StatusBadge } from '../../../components/StatusBadge';
import api from '../../../lib/api';
import { Appointment, Payment } from '../../../types';

type PaymentStatusOption = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';

interface PaymentsResponse {
  data: Payment[];
  total: number;
}

interface AppointmentsResponse {
  data: Appointment[];
}

const statusOptions: PaymentStatusOption[] = ['PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED'];

const formatCurrency = (value: number | string) => {
  const amount = Number(value);
  return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    appointmentId: '',
    value: '',
    method: '',
    status: 'PENDING',
    pixTxid: '',
    comprovanteUrl: ''
  });

  const fetchPayments = async (statusFilter?: string) => {
    try {
      setIsLoading(true);
      const response = await api.get<PaymentsResponse>('/payments', {
        params: { limit: 100, status: statusFilter }
      });
      setPayments(response.data.data);
      setTotal(response.data.total);
    } catch (e) {
      console.error(e);
      setError('Não foi possível carregar os pagamentos.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await api.get<AppointmentsResponse>('/appointments', {
        params: { limit: 100 }
      });
      setAppointments(response.data.data);
    } catch (e) {
      console.error('Erro ao buscar consultas', e);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchAppointments();
  }, []);

  const openModal = (payment?: Payment) => {
    if (payment) {
      setEditingPaymentId(payment.id);
      setFormState({
        appointmentId: payment.appointmentId,
        value: String(payment.value),
        method: payment.method,
        status: payment.status,
        pixTxid: payment.pixTxid ?? '',
        comprovanteUrl: payment.comprovanteUrl ?? ''
      });
    } else {
      setEditingPaymentId(null);
      setFormState({
        appointmentId: '',
        value: '',
        method: '',
        status: 'PENDING',
        pixTxid: '',
        comprovanteUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      ...formState,
      value: Number(formState.value)
    };

    try {
      if (editingPaymentId) {
        await api.patch(`/payments/${editingPaymentId}`, payload);
      } else {
        await api.post('/payments', payload);
      }
      setIsModalOpen(false);
      await fetchPayments(selectedStatus);
    } catch (e) {
      console.error(e);
      setError('Erro ao salvar pagamento.');
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!window.confirm('Deseja realmente excluir este pagamento?')) {
      return;
    }
    try {
      await api.delete(`/payments/${paymentId}`);
      await fetchPayments(selectedStatus);
    } catch (e) {
      console.error(e);
      setError('Erro ao remover pagamento.');
    }
  };

  const handleConfirm = async (paymentId: string) => {
    try {
      await api.patch(`/payments/${paymentId}`, { status: 'CONFIRMED' });
      await fetchPayments(selectedStatus);
    } catch (e) {
      console.error(e);
      setError('Não foi possível confirmar o pagamento.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Pagamentos</h1>
          <p className="text-sm text-gray-500">Controle recebimentos, status e conciliação.</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedStatus}
            onChange={(event) => {
              const status = event.target.value;
              setSelectedStatus(status);
              fetchPayments(status || undefined);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Todos os status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Novo pagamento
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
              <th className="px-6 py-3">Consulta</th>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Valor</th>
              <th className="px-6 py-3">Método</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                  Nenhum pagamento registrado.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{payment.appointment.procedure}</p>
                    <p className="text-xs text-gray-400">{payment.appointment.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-6 py-4">{payment.appointment.client.name}</td>
                  <td className="px-6 py-4 font-semibold text-primary">
                    {formatCurrency(payment.value)}
                  </td>
                  <td className="px-6 py-4">{payment.method}</td>
                  <td className="px-6 py-4">
                    <StatusBadge value={payment.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {payment.status !== 'CONFIRMED' && (
                        <button
                          onClick={() => handleConfirm(payment.id)}
                          className="rounded-lg border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                        >
                          Confirmar
                        </button>
                      )}
                      <button
                        onClick={() => openModal(payment)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
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

      <p className="text-xs text-gray-400">Total de pagamentos: {total}</p>

      <Modal
        title={editingPaymentId ? 'Atualizar pagamento' : 'Novo pagamento'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            Consulta
            <select
              required
              value={formState.appointmentId}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, appointmentId: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="">Selecione uma consulta</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.procedure} · {appointment.client.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Valor (R$)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={formState.value}
              onChange={(event) => setFormState((prev) => ({ ...prev, value: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Método
            <input
              required
              value={formState.method}
              onChange={(event) => setFormState((prev) => ({ ...prev, method: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            Status
            <select
              value={formState.status}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, status: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            PIX Txid
            <input
              value={formState.pixTxid}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, pixTxid: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="text-sm">
            URL do comprovante
            <input
              value={formState.comprovanteUrl}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, comprovanteUrl: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary-dark"
            >
              Salvar pagamento
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
