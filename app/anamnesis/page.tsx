'use client';

import { FormEvent, useState } from 'react';

const yesNoOptions = ['Sim', 'Não'] as const;

type YesNoValue = (typeof yesNoOptions)[number];

interface ClientForm {
  name: string;
  email: string;
  contact: string;
  age: string;
  country: string;
  birthDate: string;
  language: string;
  howDidYouKnow: string;
  referredBy: string;
  selfEsteem: string;
  consent: boolean;
  formDate: string;
  signature: string;
  habits: Record<string, YesNoValue>;
  habitsAdditional: Record<string, string>;
  medical: Record<string, YesNoValue>;
  medicalAdditional: Record<string, string>;
}

const initialHabitsQuestions: Record<string, YesNoValue> = {
  'Já realizou tratamento estético anteriormente?': 'Não',
  'Usa cosméticos diariamente?': 'Não',
  'Usa protetor solar diariamente?': 'Não',
  'Está exposta ao sol?': 'Não',
  'Consome bebidas alcoólicas ou fuma?': 'Não',
  'Realiza atividade física?': 'Não',
  'Usa anticoncepcionais?': 'Não',
  'Está grávida ou amamentando?': 'Não',
  'Tem filhos?': 'Não',
  'Está sob tratamento médico?': 'Não',
  'Toma medicamentos ou anticoagulantes?': 'Não',
  'Tem alergias?': 'Não'
};

const initialMedicalQuestions: Record<string, YesNoValue> = {
  'Reação alérgica a anestésicos?': 'Não',
  'Usa marcapasso?': 'Não',
  'Alterações cardíacas?': 'Não',
  'Epilepsia ou convulsões?': 'Não',
  'Alterações psicológicas ou psiquiátricas?': 'Não',
  'Pessoa estressada?': 'Não',
  'Hipo/hipertensão?': 'Não',
  'Diabetes?': 'Não',
  'Transtorno circulatório?': 'Não',
  'Transtorno renal?': 'Não',
  'Transtorno hormonal?': 'Não',
  'Transtorno gastrointestinal?': 'Não',
  'Antecedente oncológico?': 'Não',
  'Doença autoimune?': 'Não',
  'Herpes?': 'Não',
  'Portador(a) de HIV?': 'Não',
  'Prótese metálica ou implante dental?': 'Não',
  'Cirurgia plástica ou reparadora?': 'Não',
  'Uso de PMMA (preenchimento)?': 'Não'
};

const howDidYouKnowOptions = ['Instagram', 'Facebook', 'Outros'];

const initialForm: ClientForm = {
  name: '',
  email: '',
  contact: '',
  age: '',
  country: '',
  birthDate: '',
  language: '',
  howDidYouKnow: howDidYouKnowOptions[0],
  referredBy: '',
  selfEsteem: '5',
  consent: false,
  formDate: '',
  signature: '',
  habits: { ...initialHabitsQuestions },
  habitsAdditional: {
    'Passa mais tempo em pé ou sentada?': ''
  },
  medical: { ...initialMedicalQuestions },
  medicalAdditional: {
    'Hipo/hipertensão? Usa medicação?': '',
    'Diabetes (Tipo)': '',
    'Uso de PMMA (Zona)': ''
  }
};

const API_ENDPOINT =
  typeof window !== 'undefined'
    ? `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/integrations/forms/google`
    : '/api/integrations/forms/google';

export default function AnamnesisPage() {
  const [form, setForm] = useState<ClientForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const updateField = (key: keyof ClientForm, value: string | boolean | Record<string, unknown>) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRadioChange = (
    group: 'habits' | 'medical',
    question: string,
    value: YesNoValue
  ) => {
    setForm((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [question]: value
      }
    }));
  };

  const handleAdditionalChange = (
    group: 'habitsAdditional' | 'medicalAdditional',
    key: string,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: value
      }
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setFeedback({
      type: 'success',
      message: 'Formulário enviado com sucesso.'
    });
  };

  const buildAnamnesisPayload = () => {
    const responses: Record<string, unknown> = {
      'Como nos conheceu?': form.howDidYouKnow,
      'Recomendação de': form.referredBy,
      'Autoestima (0-10)': form.selfEsteem
    };

    Object.entries(form.habits).forEach(([question, answer]) => {
      responses[question] = answer;
    });

    Object.entries(form.habitsAdditional).forEach(([question, answer]) => {
      if (answer) {
        responses[question] = answer;
      }
    });

    Object.entries(form.medical).forEach(([question, answer]) => {
      responses[question] = answer;
    });

    Object.entries(form.medicalAdditional).forEach(([question, answer]) => {
      if (answer) {
        responses[question] = answer;
      }
    });

    responses['Data do preenchimento'] = form.formDate;
    responses['Assinatura'] = form.signature;
    responses['Concordância com uso de dados'] = form.consent ? 'Sim' : 'Não';

    return responses;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        name: form.name,
        email: form.email || undefined,
        phone: form.contact || undefined,
        age: form.age ? Number(form.age) : undefined,
        country: form.country || undefined,
        birthDate: form.birthDate || undefined,
        language: form.language || undefined,
        source: 'Anamnese Geral (Web)',
        tags: [],
        notes: undefined,
        intimateAssessmentPhotos: [],
        anamnesisResponses: buildAnamnesisPayload()
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Erro ao enviar formulário.');
      }

      resetForm();
    } catch (error) {
      console.error(error);
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Ocorreu um erro ao enviar o formulário. Tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="mx-auto max-w-5xl space-y-10 px-4">
        <header className="text-center">
          <h1 className="text-4xl font-semibold text-slate-900">Anamnese Geral</h1>
          <p className="mt-4 text-sm text-gray-500">
            Preencha cuidadosamente todas as informações para que possamos oferecer um atendimento
            mais seguro e personalizado.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Dados pessoais</h2>
            <p className="mb-6 text-sm text-gray-500">
              Preencha os dados de identificação e contato.
            </p>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-600">
                Nome completo *
                <input
                  required
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                  placeholder="Digite o nome completo"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                E-mail *
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                  placeholder="email@exemplo.com"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Telefone para contato *
                <input
                  required
                  value={form.contact}
                  onChange={(event) => updateField('contact', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                  placeholder="(00) 00000-0000"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Idade *
                <input
                  type="number"
                  min={0}
                  required
                  value={form.age}
                  onChange={(event) => updateField('age', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                País em que reside *
                <input
                  required
                  value={form.country}
                  onChange={(event) => updateField('country', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                  placeholder="Brasil"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Data de nascimento *
                <input
                  type="date"
                  required
                  value={form.birthDate}
                  onChange={(event) => updateField('birthDate', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Idioma *
                <input
                  required
                  value={form.language}
                  onChange={(event) => updateField('language', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                  placeholder="Português"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Como nos conheceu?
                <select
                  value={form.howDidYouKnow}
                  onChange={(event) => updateField('howDidYouKnow', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                >
                  {howDidYouKnowOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Recomendação de
                <input
                  value={form.referredBy}
                  onChange={(event) => updateField('referredBy', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                  placeholder="Nome da pessoa que indicou"
                />
              </label>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-600">
                Como avalia sua autoestima hoje?
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">0</span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={form.selfEsteem}
                    onChange={(event) => updateField('selfEsteem', event.target.value)}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-[#45b39d]"
                  />
                  <span className="text-xs text-gray-400">10</span>
                  <span className="rounded-full bg-[#45b39d] px-3 py-1 text-sm font-semibold text-white">
                    {form.selfEsteem}
                  </span>
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">
              Hábitos e histórico pessoal
            </h2>
            <p className="mb-6 text-sm text-gray-500">
              Indique seus hábitos diários e histórico de procedimentos.
            </p>

            <div className="space-y-6">
              {Object.keys(form.habits).map((question) => (
                <div
                  key={question}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <p className="text-sm font-medium text-gray-600">{question}</p>
                  <div className="flex gap-3">
                    {yesNoOptions.map((option) => (
                      <label
                        key={option}
                        className={`flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold transition ${
                          form.habits[question] === option
                            ? 'border-[#45b39d] bg-[#45b39d]/10 text-[#45b39d]'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          checked={form.habits[question] === option}
                          onChange={() => handleRadioChange('habits', question, option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <label className="block text-sm font-medium text-gray-600">
                Passa mais tempo em pé ou sentada?
                <input
                  value={form.habitsAdditional['Passa mais tempo em pé ou sentada?']}
                  onChange={(event) =>
                    handleAdditionalChange(
                      'habitsAdditional',
                      'Passa mais tempo em pé ou sentada?',
                      event.target.value
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                  placeholder="Descreva brevemente"
                />
              </label>
            </div>
          </section>

 	<section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Condições médicas</h2>
            <p className="mb-6 text-sm text-gray-500">
              Informe se possui alguma condição médica relevante.
            </p>

            <div className="space-y-6">
              {Object.keys(form.medical).map((question) => (
                <div
                  key={question}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <p className="text-sm font-medium text-gray-600">{question}</p>
                  <div className="flex gap-3">
                    {yesNoOptions.map((option) => (
                      <label
                        key={option}
                        className={`flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold transition ${
                          form.medical[question] === option
                            ? 'border-[#45b39d] bg-[#45b39d]/10 text-[#45b39d]'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          checked={form.medical[question] === option}
                          onChange={() => handleRadioChange('medical', question, option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <label className="block text-sm font-medium text-gray-600">
                Hipo/hipertensão? Usa medicação?
                <input
                  value={form.medicalAdditional['Hipo/hipertensão? Usa medicação?']}
                  onChange={(event) =>
                    handleAdditionalChange(
                      'medicalAdditional',
                      'Hipo/hipertensão? Usa medicação?',
                      event.target.value
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                  placeholder="Detalhe a medicação e frequência"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Diabetes (Tipo)
                <input
                  value={form.medicalAdditional['Diabetes (Tipo)']}
                  onChange={(event) =>
                    handleAdditionalChange('medicalAdditional', 'Diabetes (Tipo)', event.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                  placeholder="Tipo 1, Tipo 2, gestacional, etc."
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Uso de PMMA (Zona)
                <input
                  value={form.medicalAdditional['Uso de PMMA (Zona)']}
                  onChange={(event) =>
                    handleAdditionalChange(
                      'medicalAdditional',
                      'Uso de PMMA (Zona)',
                      event.target.value
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                  placeholder="Informe a região onde foi aplicado"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Outras informações</h2>
            <p className="mb-6 text-sm text-gray-500">
              Complete os dados finais para concluir o formulário.
            </p>

            <div className="space-y-6">
              {[
                'Prótese metálica ou implante dental?',
                'Cirurgia plástica ou reparadora?',
                'Uso de PMMA (preenchimento)?'
              ].map((question) => (
                <div
                  key={question}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <p className="text-sm font-medium text-gray-600">{question}</p>
                  <div className="flex gap-3">
                    {yesNoOptions.map((option) => (
                      <label
                        key={option}
                        className={`flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold transition ${
                          form.medical[question] === option
                            ? 'border-[#45b39d] bg-[#45b39d]/10 text-[#45b39d]'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          checked={form.medical[question] === option}
                          onChange={() => handleRadioChange('medical', question, option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(event) => updateField('consent', event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#45b39d] focus:ring-[#45b39d]"
                  required
                />
                Autorizo o uso de meus dados e imagem conforme a política da clínica.
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Data
                <input
                  type="date"
                  value={form.formDate}
                  onChange={(event) => updateField('formDate', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                />
              </label>

              <label className="block text-sm font-medium text-gray-600">
                Assinatura digital
                <textarea
                  value={form.signature}
                  onChange={(event) => updateField('signature', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-[#45b39d] focus:outline-none"
                  rows={3}
                  placeholder="Digite seu nome completo para validar a assinatura digital."
                />
              </label>
            </div>
          </section>

          {feedback && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-600'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !form.consent}
            className="w-full rounded-xl bg-[#45b39d] px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#379682] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar formulário'}
          </button>
        </form>
      </div>
    </div>
  );
}
