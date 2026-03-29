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
  // Provenance fields
  billing_class?: string;
  setting?: string;
  rate_methodology?: string;
  bcbs_tic_rate?: number | null;
  bcbs_tic_billing_class?: string;
  bcbs_source?: string;
  bcbs_plan?: string;
  hp_plan_name?: string;
  hp_source?: string;
  aetna_source?: string;
  uhc_source?: string;
  turquoise_bundled_price?: number | null;
  turquoise_quality_rating?: number | null;
  masscomparecare_total_paid?: number | null;
  fh_physician_in_network?: number | null;
  fh_anesthesia_in_network?: number | null;
  fh_facility_hosp_in_network?: number | null;
  fh_pathology_in_network?: number | null;
};

export async function fetchHospitals(cpt?: string, specialty?: string): Promise<HospitalApi[]> {
  const q = new URLSearchParams();
  if (cpt) q.set('cpt', cpt);
  if (specialty) q.set('specialty', specialty);
  const qs = q.toString();
  return json<HospitalApi[]>(`/api/hospitals${qs ? `?${qs}` : ''}`);
}

export type PaymentRow = {
  key: string;
  plan_id: string;
  plan_name: string;
  payer: string;
  hospital_id: string;
  hospital_name: string;
  scenario_id: string;
  cpt: string;
  cpt_desc: string;
  specialty: string;
  negotiated_rate_cents: number | null;
  rule_type: string;
  scenario_a_cents: number | null;
  scenario_b_cents: number | null;
  rule_summary: string;
  note: string;
  plan_deductible_cents: number;
  plan_coinsurance_pct: number;
  plan_copay_specialist_cents: number;
  plan_oop_max_cents: number;
  fh_physician_in_network: number | null;
  fh_anesthesia_in_network: number | null;
  fh_facility_hosp_in_network: number | null;
  fh_pathology_in_network: number | null;
  data_completeness: 'full' | 'benchmark_only' | 'no_data';
  billing_class: string;
};

export async function fetchPaymentTable(params?: {
  plan_id?: string;
  cpt?: string;
  hospital_id?: string;
  scenario_id?: string;
  specialty?: string;
}): Promise<PaymentRow[]> {
  const q = new URLSearchParams();
  if (params?.plan_id) q.set('plan_id', params.plan_id);
  if (params?.cpt) q.set('cpt', params.cpt);
  if (params?.hospital_id) q.set('hospital_id', params.hospital_id);
  if (params?.scenario_id) q.set('scenario_id', params.scenario_id);
  if (params?.specialty) q.set('specialty', params.specialty);
  const qs = q.toString();
  return json<PaymentRow[]>(`/api/hospitals/payment-table${qs ? `?${qs}` : ''}`);
}

export async function postIntake(intake: Record<string, unknown>): Promise<{ normalized: Record<string, unknown>; missing_required: string[] }> {
  return json('/api/intake', { method: 'POST', body: JSON.stringify(intake) });
}
