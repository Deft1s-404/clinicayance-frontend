'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import api from '../../../../lib/api';
import { Client } from '../../../../types';

interface LeadDetail {
  id: string;
  source?: string | null;
  notes?: string | null;
  stage: string;
  createdAt: string;
}

interface AppointmentDetail {
  id: string;
  procedure: string;
  start: string;
  end: string;
  status: string;
}

interface PaymentDetail {
  id: string;
  value: number;
  method: string;
  status: string;
  createdAt: string;
}

interface ClientDetail extends Client {
  leads: LeadDetail[];
  appointments: AppointmentDetail[];
  payments: PaymentDetail[];
  intimateAssessmentPhotos: string[];
  anamnesisResponses?: Record<string, unknown> | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') ? 'short' : undefined
  }).format(date);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;

    const loadClient = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<ClientDetail>(`/clients/${id}`);
        const data = response.data;
        setClient({
          ...data,
          intimateAssessmentPhotos: data.intimateAssessmentPhotos ?? [],
          anamnesisResponses: data.anamnesisResponses ?? null
        });
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar o cliente.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadClient();
  }, [params?.id]);

  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPhoto(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPhoto]);

  const anamnesisEntries = useMemo(() => {
    if (!client?.anamnesisResponses) return [];
    return Object.entries(client.anamnesisResponses);
  }, [client?.anamnesisResponses]);

  const handleClosePreview = () => setSelectedPhoto(null);

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="mx-auto max-w-6xl space-y-8 px-4">
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={handleClosePreview}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleClosePreview}
                className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-sm font-medium text-white transition hover:bg-black/80"
                aria-label="Fechar imagem"
              >
                X
              </button>
              <div className="relative mx-auto mt-6 h-[70vh] w-full">
                <Image
                  src={selectedPhoto}
                  alt="Imagem selecionada"
                  fill
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  unoptimized
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            Voltar
          </button>
          <h1 className="text-3xl font-semibold text-slate-900">Ficha do cliente</h1>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500 shadow-sm">
            Carregando informações do cliente...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 shadow-sm">
            {error}
          </div>
        )}

        {!isLoading && !error && client && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">{client.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Cliente criado em {formatDate(client.createdAt)}
                  </p>
                  {client.notes && (
                    <p className="mt-3 max-w-2xl text-sm text-gray-600">
                      <span className="font-semibold text-slate-800">Observações:</span>{' '}
                      {client.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 text-sm text-gray-600">
                  <span>
                    <strong className="text-slate-800">Status:</strong> {client.status}
                  </span>
                  <span>
                    <strong className="text-slate-800">Score:</strong> {client.score}
                  </span>
                  <span>
                    <strong className="text-slate-800">Tags:</strong>{' '}
                    {client.tags.length ? (
                      <span className="inline-flex flex-wrap gap-2">
                        {client.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#45b39d]/10 px-3 py-1 text-xs font-semibold text-[#45b39d]"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : (
                      'Nenhuma'
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="E-mail" value={client.email ?? '-'} />
                <DetailItem label="Telefone" value={client.phone ?? '-'} />
                <DetailItem label="Idade" value={client.age != null ? `${client.age} anos` : '-'} />
                <DetailItem label="País" value={client.country ?? '-'} />
                <DetailItem label="Idioma" value={client.language ?? '-'} />
                <DetailItem label="Data de nascimento" value={formatDate(client.birthDate)} />
                <DetailItem label="Origem" value={client.source ?? '-'} />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">Ficha de anamnese</h3>
              <p className="mb-6 text-sm text-gray-500">
                Respostas mais recentes registradas no momento do cadastro/atualização.
              </p>

              {anamnesisEntries.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nenhuma resposta registrada para este cliente.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {anamnesisEntries.map(([question, answer]) => (
                    <div
                      key={question}
                      className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600"
                    >
                      <p className="font-semibold text-slate-800">{question}</p>
                      <p className="mt-1">
                        {typeof answer === 'boolean'
                          ? answer
                            ? 'Sim'
                            : 'Não'
                          : Array.isArray(answer)
                          ? answer.join(', ')
                          : String(answer)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">Imagens anexadas</h3>
              <p className="mb-6 text-sm text-gray-500">
                URLs ou imagens adicionadas durante o cadastro.
              </p>

              {client.intimateAssessmentPhotos.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma imagem registrada.</p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {client.intimateAssessmentPhotos.map((url, index) => (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      onClick={() => setSelectedPhoto(url)}
                      className="group relative block h-28 w-28 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      <span className="sr-only">Ampliar imagem</span>
                      <Image
                        src={url}
                        alt={`Imagem ${index + 1}`}
                        fill
                        unoptimized
                        className="object-cover transition group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">Leads</h3>
              {client.leads.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum lead registrado para este cliente.</p>
              ) : (
                <div className="space-y-4">
                  {client.leads.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600"
                    >
                      <p>
                        <strong className="text-slate-800">Origem:</strong> {lead.source ?? '-'}
                      </p>
                      <p>
                        <strong className="text-slate-800">Estágio:</strong> {lead.stage}
                      </p>
                      {lead.notes && (
                        <p>
                          <strong className="text-slate-800">Notas:</strong> {lead.notes}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        Registrado em {formatDate(lead.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">Consultas</h3>
              {client.appointments.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma consulta registrada.</p>
              ) : (
                <div className="space-y-4">
                  {client.appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600"
                    >
                      <p>
                        <strong className="text-slate-800">Procedimento:</strong>{' '}
                        {appointment.procedure}
                      </p>
                      <p>
                        <strong className="text-slate-800">Início:</strong>{' '}
                        {formatDate(appointment.start)}
                      </p>
                      <p>
                        <strong className="text-slate-800">Término:</strong>{' '}
                        {formatDate(appointment.end)}
                      </p>
                      <p>
                        <strong className="text-slate-800">Status:</strong> {appointment.status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">Pagamentos</h3>
              {client.payments.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum pagamento registrado.</p>
              ) : (
                <div className="space-y-4">
                  {client.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600"
                    >
                      <p>
                        <strong className="text-slate-800">Valor:</strong>{' '}
                        {formatCurrency(payment.value)}
                      </p>
                      <p>
                        <strong className="text-slate-800">Método:</strong> {payment.method}
                      </p>
                      <p>
                        <strong className="text-slate-800">Status:</strong> {payment.status}
                      </p>
                      <p className="text-xs text-gray-400">
                        Registrado em {formatDate(payment.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="flex flex-wrap gap-4">
              <Link
                href={`/clients`}
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100"
              >
                Voltar para lista
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface DetailItemProps {
  label: string;
  value: string;
}

const DetailItem = ({ label, value }: DetailItemProps) => (
  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 shadow-sm">
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 font-medium text-slate-800">{value || '-'}</p>
  </div>
);
