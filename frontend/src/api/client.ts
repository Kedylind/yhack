const base = () => (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') || '';

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${base()}${path}`;
  const r = await fetch(url, {
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
};

export type ProvenanceItem = {
  field: string;
  source: string;
  confidence: number;
  kind: 'FACT' | 'ASSUMED';
};

export type ProviderEstimateApi = {
  provider_id: string;
  allowed_amount_range: { min: number; max: number; currency: string };
  oop_range: { min: number; max: number; label?: string | null };
  provenance: ProvenanceItem[];
  assumptions: string[];
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
}): Promise<EstimateResponseApi> {
  return json<EstimateResponseApi>('/api/estimate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function postIntake(intake: Record<string, unknown>): Promise<{ normalized: Record<string, unknown>; missing_required: string[] }> {
  return json('/api/intake', { method: 'POST', body: JSON.stringify(intake) });
}
