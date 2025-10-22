'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Modal } from '../../../components/Modal';
import { StatusBadge } from '../../../components/StatusBadge';
import api from '../../../lib/api';
import axios from 'axios';
import { Appointment, Client, Payment } from '../../../types';

type PaymentStatusOption = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';

interface PaymentsResponse {
  data: Payment[];
  total: number;
}

interface AppointmentsResponse {
  data: Appointment[];
}

const statusOptions: PaymentStatusOption[] = ['PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED'];
const PAYPAL_PAGE_SIZE = 20;
const PAYPAL_SYNC_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const formatCurrency = (value: number | string) => {
  const amount = Number(value);
  return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

const formatPaypalCurrency = (value: string | null, currency: string | null) => {
  if (!value) {
    return '-';
  }

  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return `${currency ?? ''} ${value}`;
  }

  return `${currency ?? 'BRL'} ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

interface PaypalTransaction {
  id: string;
  userId: string;
  clientId: string | null;
  transactionId: string;
  status: string | null;
  eventCode: string | null;
  referenceId: string | null;
  invoiceId: string | null;
  customField: string | null;
  transactionDate: string | null;
  updatedDate: string | null;
  currency: string | null;
  grossAmount: string | null;
  feeAmount: string | null;
  netAmount: string | null;
  payerEmail: string | null;
  payerName: string | null;
  payerId: string | null;
}

interface PaypalTransactionsResponse {
  items: PaypalTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

interface PaypalSyncResult {
  imported: number;
  created: number;
  updated: number;
  processedPages: number;
  totalPages: number;
  startDate: string;
  endDate: string;
}

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'paypal'>('manual');

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
  const [paymentPendingDeletion, setPaymentPendingDeletion] = useState<Payment | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const [paypalLinkModalOpen, setPaypalLinkModalOpen] = useState(false);
  const [paypalLinkTransaction, setPaypalLinkTransaction] = useState<PaypalTransaction | null>(null);
  const [paypalSelectedClientId, setPaypalSelectedClientId] = useState('');
  const [isLinkingClient, setIsLinkingClient] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientsLoading, setIsClientsLoading] = useState(false);

  const [paypalTransactions, setPaypalTransactions] = useState<PaypalTransaction[]>([]);
  const [paypalPagination, setPaypalPagination] = useState({
    page: 1,
    pageSize: PAYPAL_PAGE_SIZE,
    totalItems: 0,
    totalPages: 1
  });
  const [isPaypalLoading, setIsPaypalLoading] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [isPaypalSyncing, setIsPaypalSyncing] = useState(false);
  const [paypalMessage, setPaypalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const fetchPayments = async (statusFilter?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const params: Record<string, unknown> = { limit: 100 };
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await api.get<PaymentsResponse>('/payments', { params });
      setPayments(response.data.data ?? []);
      setTotal(response.data.total ?? 0);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        if (status === 404) {
          setPayments([]);
          setTotal(0);
          setError(null);
        } else {
          const message =
            (typeof e.response?.data === 'object' && e.response?.data !== null && 'message' in e.response.data
              ? (e.response.data as { message?: string }).message
              : undefined) ?? 'Nao foi possivel carregar os pagamentos.';
          setError(message);
        }
      } else {
        setError('Nao foi possivel carregar os pagamentos.');
      }
      console.error('Erro ao carregar pagamentos', e);
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

  const fetchClients = useCallback(
    async (search = '') => {
      try {
        setIsClientsLoading(true);
        const response = await api.get<{ data: Client[] }>('/clients', {
          params: {
            limit: 50,
            search: search ? search.trim() : undefined
          }
        });
        setClients(response.data.data ?? []);
      } catch (e) {
        console.error('Erro ao buscar clientes', e);
        setClients([]);
      } finally {
        setIsClientsLoading(false);
      }
    },
    []
  );

  const fetchPaypalTransactions = useCallback(
    async (page = 1) => {
      try {
        setIsPaypalLoading(true);
        setPaypalError(null);

        const response = await api.get<PaypalTransactionsResponse>('/payments/paypal/transactions', {
          params: {
            page,
            pageSize: PAYPAL_PAGE_SIZE
          }
        });

        setPaypalTransactions(response.data.items);
        setPaypalPagination(response.data.pagination);
      } catch (e) {
        console.error(e);
        setPaypalError('Nao foi possivel carregar os pagamentos do PayPal.');
        setPaypalTransactions([]);
      } finally {
        setIsPaypalLoading(false);
      }
    },
    []
  );

  const handlePaypalSync = useCallback(async () => {
    setPaypalMessage(null);
    setPaypalError(null);
    setIsPaypalSyncing(true);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - PAYPAL_SYNC_WINDOW_MS);

    try {
      const { data } = await api.post<PaypalSyncResult>('/payments/paypal/sync', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        pageSize: 200,
        maxPages: 5
      });

      setPaypalMessage({
        type: 'success',
        text: `Sincronizacao concluida. Novos registros: ${data.created}. Atualizados: ${data.updated}.`
      });

      await fetchPaypalTransactions(1);
    } catch (e) {
      console.error(e);
      setPaypalMessage({
        type: 'error',
        text: 'Nao foi possivel sincronizar com o PayPal. Tente novamente.'
      });
    } finally {
      setIsPaypalSyncing(false);
    }
  }, [fetchPaypalTransactions]);

  useEffect(() => {
    fetchPayments();
    fetchAppointments();
    fetchClients('');
  }, [fetchClients]);

  useEffect(() => {
    if (activeTab === 'paypal' && paypalTransactions.length === 0 && !isPaypalLoading) {
      void fetchPaypalTransactions(1);
    }
  }, [activeTab, fetchPaypalTransactions, isPaypalLoading, paypalTransactions.length]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void fetchClients(clientSearchTerm);
    }, 300);

    return () => clearTimeout(handle);
  }, [clientSearchTerm, fetchClients]);

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

  const requestDeletePayment = (payment: Payment) => {
    setPaymentPendingDeletion(payment);
  };

  const handleConfirmDeletePayment = async () => {
    if (!paymentPendingDeletion) {
      return;
    }
    try {
      setIsDeletingPayment(true);
      await api.delete(`/payments/${paymentPendingDeletion.id}`);
      setPaymentPendingDeletion(null);
      await fetchPayments(selectedStatus);
    } catch (e) {
      console.error(e);
      setError('Erro ao remover pagamento.');
    } finally {
      setIsDeletingPayment(false);
    }
  };

  const handleCancelDeletePayment = () => {
    if (isDeletingPayment) {
      return;
    }
    setPaymentPendingDeletion(null);
  };

  const handleConfirm = async (paymentId: string) => {
    try {
      await api.patch(`/payments/${paymentId}`, { status: 'CONFIRMED' });
      await fetchPayments(selectedStatus);
    } catch (e) {
      console.error(e);
      setError('Nǜo foi poss��vel confirmar o pagamento.');
    }
  };

  const openPaypalLinkModal = (transaction: PaypalTransaction) => {
    setPaypalLinkTransaction(transaction);
    setPaypalSelectedClientId(transaction.clientId ?? '');
    setClientSearchTerm('');
    setPaypalLinkModalOpen(true);
    void fetchClients('');
  };

  const closePaypalLinkModal = () => {
    if (isLinkingClient) {
      return;
    }

    setPaypalLinkModalOpen(false);
    setPaypalLinkTransaction(null);
    setPaypalSelectedClientId('');
    setClientSearchTerm('');
  };

  const handlePaypalLinkSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!paypalLinkTransaction) {
      return;
    }

    setIsLinkingClient(true);
    setPaypalMessage(null);
    setPaypalError(null);

    try {
      await api.patch(`/payments/paypal/transactions/${paypalLinkTransaction.id}`, {
        clientId: paypalSelectedClientId || null
      });

      setPaypalLinkModalOpen(false);
      setPaypalLinkTransaction(null);
      setPaypalSelectedClientId('');

      setPaypalMessage({
        type: 'success',
        text: 'Cliente vinculado com sucesso.'
      });

      await fetchPaypalTransactions(paypalPagination.page);
    } catch (e) {
      console.error(e);
      setPaypalMessage({
        type: 'error',
        text: 'Nao foi possivel vincular o cliente. Tente novamente.'
      });
    } finally {
      setIsLinkingClient(false);
    }
  };

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Pagamentos</h1>
        <p className="text-sm text-gray-500">Controle recebimentos, status e conciliacao.</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'manual'
              ? 'bg-primary text-white hover:bg-primary-dark'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pagamentos manuais
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paypal')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'paypal'
              ? 'bg-primary text-white hover:bg-primary-dark'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          PayPal
        </button>
      </div>
    </div>
  );

  const renderManualContent = () => (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
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
              <th className="px-6 py-3">Metodo</th>
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
                        onClick={() => requestDeletePayment(payment)}
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
    </>
  );

  const renderPaypalContent = () => (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fetchPaypalTransactions(paypalPagination.page)}
            disabled={isPaypalLoading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Atualizar lista
          </button>
          <button
            type="button"
            onClick={() => void handlePaypalSync()}
            disabled={isPaypalSyncing}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isPaypalSyncing ? 'Sincronizando...' : 'Sincronizar ultimos 7 dias'}
          </button>
        </div>
        <div className="text-xs text-gray-500">
          Mostrando pagina {paypalPagination.page} de {paypalPagination.totalPages}
        </div>
      </div>

      {paypalMessage && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            paypalMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-600'
          }`}
        >
          {paypalMessage.text}
        </div>
      )}

      {paypalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {paypalError}
        </div>
      )}

      <div className="rounded-2xl bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Transacao</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Valor bruto</th>
              <th className="px-6 py-3">Taxa</th>
              <th className="px-6 py-3">Valor liquido</th>
              <th className="px-6 py-3">Pagador</th>
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3 text-right">Cliente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {isPaypalLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-6 text-center text-gray-500">
                  Carregando transacoes do PayPal...
                </td>
              </tr>
            ) : paypalTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-6 text-center text-gray-500">
                  Nenhuma transacao PayPal encontrada para o periodo listado.
                </td>
              </tr>
            ) : (
              paypalTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{transaction.transactionId}</p>
                    {transaction.eventCode && (
                      <p className="text-xs text-gray-400">Evento: {transaction.eventCode}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">{transaction.status ?? '-'}</td>
                  <td className="px-6 py-4">
                    {formatPaypalCurrency(transaction.grossAmount, transaction.currency)}
                  </td>
                  <td className="px-6 py-4">
                    {formatPaypalCurrency(transaction.feeAmount, transaction.currency)}
                  </td>
                  <td className="px-6 py-4">
                    {formatPaypalCurrency(transaction.netAmount, transaction.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <p>{transaction.payerName ?? '-'}</p>
                    <p className="text-xs text-gray-400">{transaction.payerEmail ?? '-'}</p>
                  </td>
                  <td className="px-6 py-4">{formatDateTime(transaction.transactionDate)}</td>
                  <td className="px-6 py-4 text-right">
                    {transaction.clientId ? (
                      <div className="flex justify-end gap-2">
                        <a
                          href={`/clients/${transaction.clientId}`}
                          className="rounded-lg border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                        >
                          Ver cliente
                        </a>
                        <button
                          type="button"
                          onClick={() => openPaypalLinkModal(transaction)}
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                        >
                          Alterar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openPaypalLinkModal(transaction)}
                        className="rounded-lg border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                      >
                        Vincular cliente
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Total de registros: {paypalPagination.totalItems}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchPaypalTransactions(Math.max(1, paypalPagination.page - 1))}
            disabled={isPaypalLoading || paypalPagination.page <= 1}
            className="rounded border border-gray-200 px-3 py-1 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() =>
              fetchPaypalTransactions(
                Math.min(paypalPagination.totalPages, paypalPagination.page + 1)
              )
            }
            disabled={isPaypalLoading || paypalPagination.page >= paypalPagination.totalPages}
            className="rounded border border-gray-200 px-3 py-1 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Proxima
          </button>
        </div>
      </div>
    </>
  );

  const content = activeTab === 'paypal' ? renderPaypalContent() : renderManualContent();

  return (
    <div className="space-y-6">
      {header}
      {content}

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
                  {appointment.procedure} ・ {appointment.client.name}
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
            Metodo
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

      <ConfirmDialog
        title="Remover pagamento"
        description="Tem certeza que deseja remover este pagamento? Esta acao nao pode ser desfeita."
        isOpen={Boolean(paymentPendingDeletion)}
        onCancel={handleCancelDeletePayment}
        onConfirm={handleConfirmDeletePayment}
        confirmLabel="Remover"
        isConfirmLoading={isDeletingPayment}
      />

      <Modal
        title="Vincular cliente ao pagamento PayPal"
        isOpen={paypalLinkModalOpen}
        onClose={closePaypalLinkModal}
      >
        <form onSubmit={handlePaypalLinkSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">Pesquisar cliente</label>
            <input
              value={clientSearchTerm}
              onChange={(event) => setClientSearchTerm(event.target.value)}
              placeholder="Nome, email ou telefone"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">Selecione o cliente</label>
            <select
              value={paypalSelectedClientId}
              onChange={(event) => setPaypalSelectedClientId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              disabled={isClientsLoading}
            >
              <option value="">Sem vinculo</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.email ? ` (${client.email})` : ''}
                </option>
              ))}
            </select>
            {isClientsLoading ? (
              <p className="mt-2 text-xs text-gray-500">Carregando clientes...</p>
            ) : clients.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500">
                Nenhum cliente encontrado para o termo informado.
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closePaypalLinkModal}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLinkingClient}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
              disabled={isLinkingClient}
            >
              {isLinkingClient ? 'Salvando...' : 'Salvar vinculo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}







