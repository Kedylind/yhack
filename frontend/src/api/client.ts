const base = () => (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') || '';

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${base()}${path}`;
  const r = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${r.status} ${r.statusText}: ${text}`);
  }
  return r.json() as Promise<T>;
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
