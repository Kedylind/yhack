import type { CostEstimate } from '@/types';
import type { ProviderEstimateApi } from '@/api/client';

/** Map API estimate row to legacy CostEstimate for ProviderCard display. */
export function apiEstimateToCostEstimate(e: ProviderEstimateApi): CostEstimate {
  const minDollars = Math.round(e.oop_range.min / 100);
  const maxDollars = Math.round(e.oop_range.max / 100);
  const allowedMin = Math.round(e.allowed_amount_range.min / 100);
  const allowedMax = Math.round(e.allowed_amount_range.max / 100);
  return {
    providerId: e.provider_id,
    procedureName: `Allowed $${allowedMin.toLocaleString()}–$${allowedMax.toLocaleString()} (est.)`,
    patientResponsibility: maxDollars,
    note: [
      `Your OOP range (demo): $${minDollars.toLocaleString()}–$${maxDollars.toLocaleString()}.`,
      ...e.assumptions,
      e.provenance.map(p => `${p.field}: ${p.source} (${p.kind}, ${Math.round(p.confidence * 100)}%)`).join(' · '),
      'Call your plan to verify coverage and cost.',
    ].join(' '),
  };
}
