import rawCsv from '../../../data/az-data/hospital_rates_clean.csv?raw';

export type InsurerFromRates = {
  /** Slug from column name without `_price`, e.g. `bcbs` */
  key: string;
  /** Shown in dropdowns and sent as `insurance_carrier` */
  label: string;
  priceColumn: string;
};

/** Human labels for known `*_price` column prefixes */
const INSURER_LABEL_OVERRIDES: Record<string, string> = {
  bcbs: 'Blue Cross Blue Shield (BCBS)',
  aetna: 'Aetna',
  harvard_pilgrim: 'Harvard Pilgrim',
  uhc: 'UnitedHealthcare (UHC)',
};

function slugToDefaultLabel(slug: string): string {
  return slug
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function insurersFromHeader(headerCells: string[]): InsurerFromRates[] {
  const insurers: InsurerFromRates[] = [];
  for (const col of headerCells) {
    const c = col.trim();
    if (!c.endsWith('_price')) continue;
    const slug = c.replace(/_price$/, '').toLowerCase();
    if (!slug) continue;
    const label = INSURER_LABEL_OVERRIDES[slug] ?? slugToDefaultLabel(slug);
    insurers.push({ key: slug, label, priceColumn: c });
  }
  return insurers;
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function loadParsed() {
  const lines = rawCsv.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length < 2) {
    return { insurers: [] as InsurerFromRates[], bcbsPlans: [] as string[] };
  }
  const header = parseCsvLine(lines[0]);
  const insurers = insurersFromHeader(header);
  const bcbsIdx = header.findIndex(h => h.trim() === 'bcbs_plan');
  const plans: string[] = [];
  if (bcbsIdx >= 0) {
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      const plan = (cells[bcbsIdx] ?? '').trim();
      if (plan) plans.push(plan);
    }
  }
  return { insurers, bcbsPlans: uniqueSorted(plans) };
}

const parsed = loadParsed();

/** Insurer options derived from `*_price` columns in hospital_rates_clean.csv */
export const INSURERS_FROM_RATES: InsurerFromRates[] = parsed.insurers;

/** Distinct `bcbs_plan` values from the same file (for BCBS plan dropdown) */
export const BCBS_PLAN_OPTIONS: string[] = parsed.bcbsPlans;

export const BCBS_INSURER_KEY = 'bcbs';

export function isBcbsInsurerKey(key: string): boolean {
  return key.toLowerCase() === BCBS_INSURER_KEY;
}

/** Plan configs for auto-fill when user selects a carrier + plan type. */
export type PlanConfig = {
  id: string;
  payer: string;
  carrierKey: string;
  planName: string;
  planType: 'PPO' | 'HMO';
  deductible: number;
  oopMax: number;
  coinsurancePct: number;
  copaySpecialist: number;
};

export const PLAN_CONFIGS: PlanConfig[] = [
  { id: 'bcbs_ppo', payer: 'Blue Cross Blue Shield (BCBS)', carrierKey: 'bcbs', planName: 'Blue Cross PPO', planType: 'PPO', deductible: 1500, oopMax: 6000, coinsurancePct: 20, copaySpecialist: 50 },
  { id: 'bcbs_hmo', payer: 'Blue Cross Blue Shield (BCBS)', carrierKey: 'bcbs', planName: 'Blue Cross HMO Blue', planType: 'HMO', deductible: 500, oopMax: 4000, coinsurancePct: 10, copaySpecialist: 40 },
  { id: 'aetna_ppo', payer: 'Aetna', carrierKey: 'aetna', planName: 'Aetna Open Access PPO', planType: 'PPO', deductible: 2000, oopMax: 7000, coinsurancePct: 20, copaySpecialist: 50 },
  { id: 'hp_ppo', payer: 'Harvard Pilgrim', carrierKey: 'harvard_pilgrim', planName: 'Harvard Pilgrim Choice PPO', planType: 'PPO', deductible: 1500, oopMax: 6000, coinsurancePct: 20, copaySpecialist: 50 },
  { id: 'hp_hmo', payer: 'Harvard Pilgrim', carrierKey: 'harvard_pilgrim', planName: 'Harvard Pilgrim Best Buy HMO', planType: 'HMO', deductible: 500, oopMax: 4000, coinsurancePct: 10, copaySpecialist: 40 },
  { id: 'uhc_ppo', payer: 'UnitedHealthcare (UHC)', carrierKey: 'uhc', planName: 'UnitedHealthcare Choice Plus PPO', planType: 'PPO', deductible: 2000, oopMax: 7500, coinsurancePct: 20, copaySpecialist: 50 },
];

/** Get plan configs available for a given carrier key. */
export function getPlansForCarrier(carrierKey: string): PlanConfig[] {
  return PLAN_CONFIGS.filter(p => p.carrierKey === carrierKey);
}
