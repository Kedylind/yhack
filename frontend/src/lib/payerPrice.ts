import type { HospitalApi } from '@/api/client';

type PayerField = 'bcbs_price' | 'aetna_price' | 'harvard_pilgrim_price' | 'uhc_price';

const CARRIER_TO_FIELD: Record<string, PayerField> = {
  bcbs: 'bcbs_price',
  aetna: 'aetna_price',
  harvard_pilgrim: 'harvard_pilgrim_price',
  uhc: 'uhc_price',
};

/** Map an insurance carrier label to a payer key. Mirrors backend payer_mapping.py. */
export function carrierKeyFromLabel(carrier: string): string {
  const c = carrier.toLowerCase();
  if (c.includes('blue cross') || c.includes('bcbs')) return 'bcbs';
  if (c.includes('aetna')) return 'aetna';
  if (c.includes('harvard') || c.includes('pilgrim')) return 'harvard_pilgrim';
  if (c.includes('united') || c.includes('uhc') || c.includes('unitedhealth')) return 'uhc';
  return 'bcbs';
}

/** Get the negotiated price for the user's payer. Falls back to BCBS if payer field is null. */
export function getPayerPrice(hospital: HospitalApi, carrier: string): number | null {
  const key = carrierKeyFromLabel(carrier);
  const field = CARRIER_TO_FIELD[key] ?? 'bcbs_price';
  const val = hospital[field] as number | null;
  if (val != null) return val;
  return hospital.bcbs_price;
}

/** Estimate patient cost: (negotiated_rate - deductible) * coinsurance%. */
export function computeYourPlanEstimate(
  payerPrice: number,
  deductible: number,
  coinsurancePct: number,
): number {
  const afterDeductible = Math.max(0, payerPrice - deductible);
  return Math.round(afterDeductible * coinsurancePct / 100);
}
