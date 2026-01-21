import { SupportedLanguage } from '../context/SettingsContext';

const translations = {
  'pt-BR': {
    navDashboard: 'Dashboard',
    navClients: 'Clientes',
    navAlunos: 'Alunos',
    navLeads: 'Leads',
    navCourseLeads: 'Leads Curso',
    navWaitlist: 'Lista de espera',
    navAppointments: 'Consultas',
    navCalendar: 'Calendário',
    navKnowledge: 'Base de conhecimento',
    navServices: 'Tabela de preços',
    navPayments: 'Pagamentos',
    navCampaigns: 'Campanhas',
    navIntegrations: 'Integrações',
    navUsers: 'Usuários',
    navReports: 'Relatórios',
    actionConfigure: 'Configurações',
    actionLogout: 'Sair',
    actionLoggingOut: 'Saindo...',
    settingsTitle: 'Configurações do CRM',
    settingsLanguageTitle: 'Idioma da plataforma',
    settingsLanguageDescription:
      'Altere entre Português (Brasil) e Espanhol. Os próximos acessos utilizarão esta preferência.',
    settingsLanguageToggle: 'Alternar idioma rapidamente',
    settingsThemeTitle: 'Modo escuro',
    settingsThemeDescription: 'Inverte as cores do CRM para trabalhar em ambientes pouco iluminados.',
    settingsThemeActive: 'Ativo',
    settingsThemeInactive: 'Desativado',
    settingsThemeStatusDark: 'Atualmente em modo escuro.',
    settingsThemeStatusLight: 'Atualmente em modo claro.',
    selectLanguagePt: 'Português (Brasil)',
    selectLanguageEs: 'Español'
  },
  es: {
    navDashboard: 'Panel',
    navClients: 'Pacientes',
    navAlunos: 'Alumnos',
    navLeads: 'Leads',
    navCourseLeads: 'Leads Curso',
    navWaitlist: 'Lista de espera',
    navAppointments: 'Consultas',
    navCalendar: 'Calendario',
    navKnowledge: 'Base de conocimiento',
    navServices: 'Tabla de precios',
    navPayments: 'Pagos',
    navCampaigns: 'Campañas',
    navIntegrations: 'Integraciones',
    navUsers: 'Usuarios',
    navReports: 'Reportes',
    actionConfigure: 'Configuraciones',
    actionLogout: 'Salir',
    actionLoggingOut: 'Saliendo...',
    settingsTitle: 'Configuraciones del CRM',
    settingsLanguageTitle: 'Idioma de la plataforma',
    settingsLanguageDescription:
      'Cambie entre Portugués (Brasil) y Español. Los próximos accesos utilizarán esta preferencia.',
    settingsLanguageToggle: 'Alternar idioma rápidamente',
    settingsThemeTitle: 'Modo oscuro',
    settingsThemeDescription: 'Invierte los colores del CRM para trabajar en ambientes con poca luz.',
    settingsThemeActive: 'Activo',
    settingsThemeInactive: 'Inactivo',
    settingsThemeStatusDark: 'Actualmente en modo oscuro.',
    settingsThemeStatusLight: 'Actualmente en modo claro.',
    selectLanguagePt: 'Portugués (Brasil)',
    selectLanguageEs: 'Español'
  }
} as const;

export type TranslationKey = keyof (typeof translations)['pt-BR'];

export const getTranslationsFor = (language: SupportedLanguage) => translations[language] ?? translations['pt-BR'];

export const translate = (language: SupportedLanguage, key: TranslationKey): string =>
  getTranslationsFor(language)[key] ?? key;
