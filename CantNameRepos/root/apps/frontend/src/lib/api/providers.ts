import { apiFetch } from "./client";

export type Provider = {
  id: string;
  name: string;
  care_setting: string;
  specialty: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  networks: string[];
};

export type ProviderListResponse = {
  providers: Provider[];
};

export async function getProviders(
  planId: string,
  careSetting: string
): Promise<ProviderListResponse> {
  const query = new URLSearchParams({
    plan_id: planId,
    care_setting: careSetting,
  });

  return apiFetch<ProviderListResponse>(`/api/v1/providers?${query.toString()}`);
}
