import type { InsuranceProfile, UserProfile } from '@/types';

const base = () => (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') || '';

export type AccessTokenGetter = () => Promise<string | null | undefined>;

let accessTokenGetter: AccessTokenGetter | null = null;

/** Called from AuthContext so API requests can attach `Authorization: Bearer` when logged in with Auth0. */
export function setApiAccessTokenGetter(fn: AccessTokenGetter | null) {
  accessTokenGetter = fn;
}

async function authHeaders(): Promise<HeadersInit> {
  if (!accessTokenGetter) return {};
  try {
    const token = await accessTokenGetter();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${base()}${path}`;
  const extra = await authHeaders();
  const r = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...extra, ...init?.headers },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${r.status} ${r.statusText}: ${text}`);
  }
  return r.json() as Promise<T>;
}

export type UserMeApi = {
  sub: string;
  email: string | null;
  user_profile: Record<string, unknown> | null;
  insurance_profile: Record<string, unknown> | null;
};

export function userProfileToApi(p: UserProfile): Record<string, unknown> {
  const o: Record<string, unknown> = {
    fullName: p.fullName,
    dob: p.dob,
    zip: p.zip,
    phone: p.phone,
  };
  if (p.onboardingCompleted != null) o.onboarding_completed = p.onboardingCompleted;
  return o;
}

export function insuranceProfileToApi(p: InsuranceProfile): Record<string, unknown> {
  return {
    carrier: p.carrier,
    planName: p.planName,
    memberId: p.memberId,
    planType: p.planType,
    deductible: p.deductible,
    oopMax: p.oopMax,
    copay: p.copay,
    coinsurance: p.coinsurance,
  };
}

export function userProfileFromApi(raw: Record<string, unknown> | null | undefined): UserProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    fullName: String(raw.fullName ?? ''),
    dob: raw.dob ? String(raw.dob) : undefined,
    zip: String(raw.zip ?? ''),
    phone: raw.phone ? String(raw.phone) : undefined,
    onboardingCompleted:
      typeof raw.onboarding_completed === 'boolean' ? raw.onboarding_completed : undefined,
  };
}

export function insuranceProfileFromApi(raw: Record<string, unknown> | null | undefined): InsuranceProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const planType = raw.planType;
  const pt =
    planType === 'PPO' || planType === 'HMO' || planType === 'EPO' || planType === 'Other'
      ? planType
      : 'Other';
  return {
    carrier: String(raw.carrier ?? ''),
    planName: String(raw.planName ?? ''),
    memberId: raw.memberId ? String(raw.memberId) : undefined,
    planType: pt,
    deductible: Number(raw.deductible ?? 0),
    oopMax: Number(raw.oopMax ?? 0),
    copay: raw.copay !== undefined && raw.copay !== null ? Number(raw.copay) : undefined,
    coinsurance: raw.coinsurance !== undefined && raw.coinsurance !== null ? Number(raw.coinsurance) : undefined,
  };
}

export async function fetchUserMe(): Promise<UserMeApi> {
  return json<UserMeApi>('/api/users/me');
}

export async function patchUserMe(body: {
  user_profile?: Record<string, unknown>;
  insurance_profile?: Record<string, unknown>;
}): Promise<UserMeApi> {
  return json<UserMeApi>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export type ProviderApi = {
  id: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  lat: number;
  lng: number;
  phone?: string;
  specialties: string[];
  source?: string;
  hospital?: string;
};

export type ProvenanceItem = {
  field: string;
  source: string;
  confidence: number;
  kind: 'FACT' | 'ASSUMED';
};

export type ProviderEstimateApi = {
  provider_id: string;
  allowed_amount_range: { min: number; max: number; currency?: string };
  oop_range: { min: number; max: number; label?: string | null };
  provenance: ProvenanceItem[];
  assumptions: string[];
  other_insurers_oop_range?: { min: number; max: number; label?: string | null } | null;
  payer_used?: string | null;
};

export type EstimateResponseApi = {
  bundle_id: string;
  scenario_id: string;
  providers: ProviderApi[];
  estimates: ProviderEstimateApi[];
};

export async function fetchProviders(params?: { specialty?: string; zip?: string }): Promise<ProviderApi[]> {
  const q = new URLSearchParams();
  if (params?.specialty) q.set('specialty', params.specialty);
  if (params?.zip) q.set('zip', params.zip);
  const qs = q.toString();
  return json<ProviderApi[]>(`/api/providers${qs ? `?${qs}` : ''}`);
}

export async function postEstimate(body: {
  intake: Record<string, unknown>;
  confirmed?: Record<string, unknown>;
  /** When set, pricing uses this bundle’s CPT row in Mongo (see GI decision tree). */
  bundle_id?: string;
  scenario_id?: string;
}): Promise<EstimateResponseApi> {
  return json<EstimateResponseApi>('/api/estimate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type HospitalApi = {
  name: string;
  hospital_id: string | null;
  lat: number;
  lng: number;
  doctor_count: number;
  bcbs_price: number | null;
  aetna_price: number | null;
  harvard_pilgrim_price: number | null;
  uhc_price: number | null;
  de_identified_min: number | null;
  de_identified_max: number | null;
  gross_charge: number | null;
  discounted_cash: number | null;
  cpt: string;
  cpt_desc: string;
};

export async function fetchHospitals(cpt?: string): Promise<HospitalApi[]> {
  const q = cpt ? `?cpt=${cpt}` : '';
  return json<HospitalApi[]>(`/api/hospitals${q}`);
}

export type InsurerOptionApi = {
  key: string;
  label: string;
  price_column: string;
};

export type InsuranceOptionsApi = {
  insurers: InsurerOptionApi[];
  bcbs_plan_options: string[];
  /** Distinct plan strings per insurer key (from Mongo hospital_rates). May be empty for payers without plan columns. */
  plan_options_by_insurer: Record<string, string[]>;
};

export async function fetchInsuranceOptions(): Promise<InsuranceOptionsApi> {
  return json<InsuranceOptionsApi>('/api/hospitals/insurance-options');
}

export async function postIntake(intake: Record<string, unknown>): Promise<{ normalized: Record<string, unknown>; missing_required: string[] }> {
  return json('/api/intake', { method: 'POST', body: JSON.stringify(intake) });
}

export type GiAssistantSuggestResponse = {
  recommended_next_id: string | null;
  assistant_message: string;
  confidence: 'high' | 'medium' | 'low';
  safety_hold?: boolean;
  safety_message?: string;
  safety_resources?: { label: string; href: string }[];
};

export async function postGiAssistantSuggest(body: {
  current_node_id: string;
  question_prompt: string;
  hint?: string | null;
  options: { label: string; nextId: string }[];
  symptom_notes?: string;
  user_message?: string;
}): Promise<GiAssistantSuggestResponse> {
  return json<GiAssistantSuggestResponse>('/api/gi-assistant/suggest-next', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type GiSymptomRefineResponse = {
  phase: 'continue' | 'propose';
  next_question: string | null;
  recommended_leaf_id: string | null;
  assistant_message: string;
  /** Short labels for tap buttons; empty when the model wants free text */
  choice_options?: string[];
  confidence: 'high' | 'medium' | 'low';
  rationale: string | null;
  safety_hold?: boolean;
  safety_message?: string;
  safety_resources?: { label: string; href: string }[];
};

export async function postGiSymptomRefine(body: {
  messages: { role: 'user' | 'assistant'; content: string }[];
  symptom_notes?: string;
}): Promise<GiSymptomRefineResponse> {
  return json<GiSymptomRefineResponse>('/api/gi-assistant/symptom-refine', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
