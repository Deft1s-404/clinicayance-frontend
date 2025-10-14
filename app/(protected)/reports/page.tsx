'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { MetricCard } from '../../../components/MetricCard';
import api from '../../../lib/api';
import { AppointmentsReport, FunnelReport, RevenueReport } from '../../../types';

interface RevenueFilters {
  period: 'day' | 'month';
  start?: string;
  end?: string;
}

export default function ReportsPage() {
  const [funnelReport, setFunnelReport] = useState<FunnelReport | null>(null);
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [appointmentsReport, setAppointmentsReport] = useState<AppointmentsReport | null>(null);
  const [filters, setFilters] = useState<RevenueFilters>({
    period: 'day'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async (customFilters = filters) => {
    try {
      setLoading(true);
      setError(null);
      const [funnelRes, revenueRes, appointmentsRes] = await Promise.all([
        api.get<FunnelReport>('/reports/funnel'),
        api.get<RevenueReport>('/reports/revenue', { params: customFilters }),
        api.get<AppointmentsReport>('/reports/appointments', {
          params: { start: customFilters.start, end: customFilters.end }
        })
      ]);

      setFunnelReport(funnelRes.data);
      setRevenueReport(revenueRes.data);
      setAppointmentsReport(appointmentsRes.data);
    } catch (e) {
      console.error(e);
      setError('Não foi possível carregar os relatórios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFilterChange = (key: keyof RevenueFilters, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value || undefined
    } as RevenueFilters;
    setFilters(newFilters);
  };

  const totalRevenue = revenueReport?.total ?? 0;
  const conversionRate = funnelReport?.conversionRate ?? 0;
  const totalLeads = funnelReport?.counts.lead_created ?? 0;
  const totalPayments = funnelReport?.counts.payment_confirmed ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Relatórios e métricas</h1>
          <p className="text-sm text-gray-500">
            Explore o funil de conversão, faturamento e performance de agendamentos.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total de leads" value={totalLeads} />
        <MetricCard label="Pagamentos confirmados" value={totalPayments} />
        <MetricCard
          label="Faturamento"
          value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        />
        <MetricCard label="Taxa de conversão" value={`${conversionRate}%`} />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Filtro de período</h2>
            <p className="text-xs text-gray-500">Ajuste os intervalos para refinar os relatórios.</p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex flex-col">
              <span className="text-xs text-gray-400">Período</span>
              <select
                value={filters.period}
                onChange={(event) => handleFilterChange('period', event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              >
                <option value="day">Por dia</option>
                <option value="month">Por mês</option>
              </select>
            </label>

            <label className="flex flex-col">
              <span className="text-xs text-gray-400">Início</span>
              <input
                type="date"
                value={filters.start ?? ''}
                onChange={(event) => handleFilterChange('start', event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-xs text-gray-400">Fim</span>
              <input
                type="date"
                value={filters.end ?? ''}
                onChange={(event) => handleFilterChange('end', event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </label>

            <button
              onClick={() => fetchReports()}
              className="self-end rounded-lg border border-gray-200 px-4 py-2 font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && <div className="text-sm text-gray-500">Carregando relatórios...</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Faturamento confirmado</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueReport?.series ?? []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1f7f63" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#1f7f63" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  formatter={(value: number) =>
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  }
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#1f7f63"
                  fill="url(#colorRevenue)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Consultas por semana</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointmentsReport?.byWeek ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="total" fill="#1f7f63" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Detalhe do funil</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {funnelReport &&
            Object.entries(funnelReport.counts).map(([stage, count]) => (
              <div key={stage} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {stage.replace(/_/g, ' ')}
                </p>
                <p className="mt-1 text-2xl font-semibold text-primary">{count}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
