export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
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
  intimateAssessmentPhotos: string[];
  anamnesisResponses?: Record<string, unknown> | null;
}

export interface Lead {
  id: string;
  clientId: string;
  source?: string | null;
  notes?: string | null;
  score: number;
  stage: string;
  createdAt: string;
  client: {
    id: string;
    name: string;
    email?: string | null;
  };
}

export interface Appointment {
  id: string;
  clientId: string;
  procedure: string;
  start: string;
  end: string;
  status: string;
  client: {
    id: string;
    name: string;
    email?: string | null;
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
