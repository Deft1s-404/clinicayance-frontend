export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  apiKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  source?: string | null;
  tags: string[];
  score: number;
  status: string;
  createdAt: string;
  notes?: string | null;
  age?: number | null;
  country?: string | null;
  birthDate?: string | null;
  language?: string | null;
  anamnesisResponses?: Record<string, unknown> | null;
  beforeAfterPhotos?: TreatmentImage[] | null;
}

export interface TreatmentImage {
  id: string;
  url: string;
  uploadedAt: string;
}

export interface Aluno {
  id: string;
  nomeCompleto: string;
  telefone?: string | null;
  pais?: string | null;
  email?: string | null;
  profissao?: string | null;
  curso?: string | null;
  pagamentoOk: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseLead {
  id: string;
  nomeCompleto: string;
  telefone?: string | null;
  pais?: string | null;
  email?: string | null;
  origem: string;
  nota?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  notes?: string | null;
  score: number;
  stage: string;
  createdAt: string;
}

export type AppointmentType = 'IN_PERSON' | 'ONLINE';

export interface Appointment {
  id: string;
  clientId: string;
  procedure: string;
  country?: string | null;
  type: AppointmentType;
  meetingLink?: string | null;
  start: string;
  end: string;
  status: string;
  client: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
}

export interface Payment {
  id: string;
  appointmentId: string;
  value: number;
  method: string;
  status: string;
  pixTxid?: string | null;
  comprovanteUrl?: string | null;
  createdAt: string;
  appointment: {
    id: string;
    procedure: string;
    client: {
      id: string;
      name: string;
    };
  };
}

export interface CampaignLog {
  id: string;
  message: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  message: string;
  imageUrl?: string | null;
  status: string;
  scheduledAt?: string | null;
  logs?: CampaignLog[];
}

export interface FunnelReport {
  counts: Record<string, number>;
  conversionRate: number;
}

export interface RevenueSeriesItem {
  label: string;
  total: number;
}

export interface RevenueReport {
  total: number;
  series: RevenueSeriesItem[];
}

export interface AppointmentsReport {
  byStatus: Record<string, number>;
  byWeek: RevenueSeriesItem[];
}

export type CalendarEntryType = 'AVAILABLE' | 'TRAVEL' | 'BLOCKED';

export interface CalendarEntry {
  id: string;
  title: string;
  description?: string | null;
  type: CalendarEntryType;
  start: string;
  end: string;
  allDay: boolean;
  timezone?: string | null;
  country?: string | null;
  city?: string | null;
  location?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistEntry {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  desiredCourse?: string | null;
  country?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOffering {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  country?: string | null;
  currency: string;
  price: number;
  durationMinutes?: number | null;
  notes?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeEntryStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface KnowledgeEntry {
  id: string;
  title: string;
  slug?: string | null;
  summary?: string | null;
  content: string;
  tags: string[];
  category?: string | null;
  audience?: string | null;
  language?: string | null;
  status: KnowledgeEntryStatus;
  priority: number;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
