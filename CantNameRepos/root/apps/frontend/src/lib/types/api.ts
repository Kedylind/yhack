export type CareSetting =
  | "telederm"
  | "pcp"
  | "dermatology"
  | "urgent_care"
  | "cosmetic_derm";

export type IntakeAnswers = {
  severity: "mild" | "moderate" | "severe";
  duration_weeks: number;
  first_time_visit: boolean;
  wants_cosmetic_treatment: boolean;
  facial_swelling: boolean;
  fever: boolean;
  rapidly_worsening: boolean;
  pregnant: boolean;
};

export type IntakeRequest = {
  zip_code: string;
  age: number;
  plan_id: string;
  category: "acne";
  answers: IntakeAnswers;
};

export type ScenarioCosts = {
  deductible_met: number;
  deductible_partial: number;
  deductible_not_met: number;
};

export type CostBundle = {
  id: string;
  name: string;
  care_setting: CareSetting;
  description: string;
  scenario_costs: ScenarioCosts;
  notes: string[];
};

export type Recommendation = {
  care_setting: CareSetting;
  rank: number;
  rationale: string;
  bundles: CostBundle[];
};

export type EvaluationResponse = {
  supported: boolean;
  red_flag: {
    triggered: boolean;
    message?: string | null;
  };
  recommendations: Recommendation[];
  assumptions: string[];
};
