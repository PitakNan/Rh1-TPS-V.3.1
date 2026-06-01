export interface Hospital {
  hospital_code: string
  hospital_name: string
  province: string
  zone: number | null
  type: string
  group: string
}

export interface Period {
  period_id: string
  year: number
  quarter: number
}

export interface TpsScore {
  hospital_code: string
  period_id: string
  tps_score: number | null
  grade: string | null
  group: string | null
  pt_sum: number | null
  pt_eval: number | null
  score_1_1: number | null
  score_1_2: number | null
  score_1_3: number | null
  score_1_3_1: number | null
  score_1_3_2: number | null
  score_1_3_3: number | null
  score_2_1: number | null
  score_2_2: number | null
  score_outcome: number | null
  score_process: number | null
}

export interface RiskProfile {
  hospital_code: string
  period_id: string
  rp_grade_plus: string | null
  rp_risk_score: number | null
  rp_cr: number | null
  rp_qr: number | null
  rp_cash: number | null
  rp_nwc: number | null
  rp_ebitda: number | null
  rp_roa: number | null
  rp_opm: number | null
  rp_reserve: number | null
  bo_beds: number | null
  bo_cmi: number | null
  bo_rate: number | null
  sa_value: number | null
  sa_median: number | null
}

export interface FinancialPerformance {
  hospital_code: string
  period_id: string
  rev_plan: number | null
  rev_actual: number | null
  rev_pct: number | null
  rev_pass: number | null
  exp_plan: number | null
  exp_actual: number | null
  exp_pct: number | null
  exp_pass: number | null
}

export interface FinancialRatio {
  hospital_code: string
  period_id: string
  ratio_cr: number | null
  ratio_qr: number | null
  ratio_cash: number | null
  ratio_nwc: number | null
  ratio_ebitda: number | null
  ratio_opm: number | null
  ratio_roa: number | null
  ratio_im: number | null
  ratio_reserve: number | null
}

export interface QualityMetric {
  hospital_code: string
  period_id: string
  qm_op_cost: number | null
  qm_op_mean: number | null
  qm_ip_cost: number | null
  qm_ip_mean: number | null
  hgr_lc: number | null
  hgr_drug: number | null
  hgr_sci: number | null
  hgr_nondrug: number | null
}

export interface Indicator {
  hospital_code: string
  period_id: string
  // pass/fail (0/1)
  ind_revenue: number | null
  ind_trial_bal: number | null
  ind_qm_op: number | null
  ind_qm_ip: number | null
  ind_opm: number | null
  ind_roa: number | null
  ind_cash: number | null
  ind_app_d: number | null
  ind_aip: number | null
  // score (0/0.5)
  ind_lc: number | null
  ind_drug: number | null
  ind_sci_mat: number | null
  ind_non_drug: number | null
  ind_acp_uc: number | null
  ind_acp_cs: number | null
  // actual values
  ind_nwc: number | null
  ind_ebitda: number | null
  ind_expense: number | null
  ind_bed_occ: number | null
  ind_app_d_val: number | null
  ind_acp_uc_val: number | null
  ind_acp_cs_val: number | null
  ind_aip_val: number | null
  ind_sum_adjrw: number | null
}

export type GradeValue = 'A' | 'B' | 'C' | 'D' | 'F'

export interface GradeDist {
  grade: string
  count: number
  pct: number
}

export interface TrendPoint {
  period_id: string
  avg_tps: number
  count: number
}
