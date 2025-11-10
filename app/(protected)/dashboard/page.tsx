'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import api from '../../../lib/api';
import { MetricCard } from '../../../components/MetricCard';
import { Loading } from '../../../components/Loading';
import { AppointmentsReport, FunnelReport, RevenueReport } from '../../../types';

interface LeadsByOrigin {
  label: string;
  total: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funnelReport, setFunnelReport] = useState<FunnelReport | null>(null);
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [appointmentsReport, setAppointmentsReport] = useState<AppointmentsReport | null>(null);
  const [leadsByOrigin, setLeadsByOrigin] = useState<LeadsByOrigin[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [funnelRes, revenueRes, appointmentsRes, leadsRes] = await Promise.all([
          api.get<FunnelReport>('/reports/funnel'),
          api.get<RevenueReport>('/reports/revenue', { params: { period: 'month' } }),
          api.get<AppointmentsReport>('/reports/appointments'),
          api.get<{ data: { source?: string | null }[] }>('/leads', { params: { limit: 100 } })
        ]);

        setFunnelReport(funnelRes.data);
        setRevenueReport(revenueRes.data);
        setAppointmentsReport(appointmentsRes.data);

        const originsMap = leadsRes.data.data.reduce<Record<string, number>>((acc, lead) => {
          const origin = lead.source ?? 'Não informado';
          acc[origin] = (acc[origin] ?? 0) + 1;
          return acc;
        }, {});

        setLeadsByOrigin(
          Object.entries(originsMap)
            .map(([label, total]) => ({ label, total }))
            .sort((a, b) => b.total - a.total)
        );
      } catch (e) {
        console.error(e);
        setError('Não foi possível carregar os dados do dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const conversionRate = funnelReport?.conversionRate ?? 0;
  const leadsCount = funnelReport?.counts?.lead_created ?? 0;
  const appointmentsCount = funnelReport?.counts?.appointment_booked ?? 0;
  const paymentsCount = funnelReport?.counts?.payment_confirmed ?? 0;
  const revenueTotal = revenueReport?.total ?? 0;

  const topOrigins = useMemo(() => leadsByOrigin.slice(0, 4), [leadsByOrigin]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-slate-900">Visão Geral</h1>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Leads Totais" value={leadsCount} helper="Novos contatos no funil" />
        <MetricCard
          label="Consultas agendadas"
          value={appointmentsCount}
          helper="Consultas marcadas no período"
        />
        <MetricCard
          label="Pagamentos confirmados"
          value={paymentsCount}
          helper="Fluxo financeiro concluído"
        />
        <MetricCard
          label="Taxa de conversão"
          value={`${conversionRate}%`}
          helper="Leads convertidos em vendas"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Faturamento confirmado (mensal)</h2>
          <p className="mt-1 text-sm text-gray-500">
            Total acumulado: R$ {revenueTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueReport?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  formatter={(value: number) =>
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  }
                />
                <Line type="monotone" dataKey="total" stroke="#d4b26e" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Leads por origem</h2>
          <ul className="mt-4 space-y-3">
            {topOrigins.map((origin) => (
              <li key={origin.label} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-600">{origin.label}</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {origin.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Consultas por status</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          {appointmentsReport &&
            Object.entries(appointmentsReport.byStatus).map(([status, total]) => (
              <div
                key={status}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
              >
                <p className="font-semibold capitalize text-gray-600">
                  {status.replace(/_/g, ' ').toLowerCase()}
                </p>
                <p className="text-lg font-bold text-primary">{total}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
