export interface Provider {
  id: string;
  name: string;
  specialty: string[];
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  inNetwork?: boolean;
  distance?: number;
}

export interface CostEstimate {
  providerId: string;
  procedureCode?: string;
  procedureName?: string;
  totalCost?: number;
  deductibleApplied?: number;
  copay?: number;
  coinsurance?: number;
  patientResponsibility: number;
  note?: string;
}

export interface UserProfile {
  fullName: string;
  dob?: string;
  zip: string;
  phone?: string;
}

export interface InsuranceProfile {
  carrier: string;
  planName: string;
  memberId?: string;
  planType: 'PPO' | 'HMO' | 'EPO' | 'Other';
  deductible: number;
  oopMax: number;
  copay?: number;
  coinsurance?: number;
}

export interface OnboardingData {
  profile: UserProfile;
  insurance: InsuranceProfile;
  careFocus: string;
}
