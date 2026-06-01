import type {
  Hospital, Period, TpsScore, RiskProfile,
  FinancialPerformance, FinancialRatio, QualityMetric,
  Indicator, GradeDist, TrendPoint,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function load<T>(name: string): Promise<any[]> {
  // ทุกหน้าเป็น client component → fetch จาก /data/ ที่ public/
  try {
    const res = await fetch(`/data/${name}.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status} loading ${name}`)
    return await res.json()
  } catch (error) {
    console.error(`[fetchData] ✗ Failed to load ${name}:`, error)
    return []
  }
}

// JSON บางไฟล์เก็บตัวเลขเป็น string → แปลงให้เป็น number หรือ null
function toNum(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

export async function getHospitals(): Promise<Hospital[]> {
  const rows = await load('hospitals')
  return rows.map(h => ({
    ...h,
    hospital_code: String(h.hospital_code),  // hospitals.json เก็บเป็น int → normalize เป็น string
    zone: toNum(h.zone),
  })) as Hospital[]
}

export async function getPeriods(): Promise<Period[]> {
  const rows = await load('periods')
  return rows.sort((a, b) => a.period_id.localeCompare(b.period_id)) as Period[]
}

export async function getTpsScores(period_id?: string): Promise<TpsScore[]> {
  const rows = await load('tps_scores')
  const normalized = rows.map(s => ({
    ...s,
    hospital_code: String(s.hospital_code),
    tps_score:     toNum(s.tps_score),
    score_1_1:     toNum(s.score_1_1),
    score_1_2:     toNum(s.score_1_2),
    score_1_3:     toNum(s.score_1_3),
    score_2_1:     toNum(s.score_2_1),
    score_2_2:     toNum(s.score_2_2),
    score_1_3_1:   toNum(s.score_1_3_1),
    score_1_3_2:   toNum(s.score_1_3_2),
    score_1_3_3:   toNum(s.score_1_3_3),
    score_outcome: toNum(s.score_outcome),
    score_process: toNum(s.score_process),
    pt_sum:        toNum(s.pt_sum),
    pt_eval:       toNum(s.pt_eval),
  })) as TpsScore[]
  return period_id ? normalized.filter(r => r.period_id === period_id) : normalized
}

export async function getRiskProfiles(period_id?: string): Promise<RiskProfile[]> {
  const rows = await load('risk_profile')
  const normalized = rows.map(r => ({
    ...r,
    hospital_code: String(r.hospital_code),
    rp_risk_score: toNum(r.rp_risk_score),
    rp_cr: toNum(r.rp_cr), rp_qr: toNum(r.rp_qr), rp_cash: toNum(r.rp_cash),
    rp_nwc: toNum(r.rp_nwc), rp_ebitda: toNum(r.rp_ebitda), rp_roa: toNum(r.rp_roa),
    rp_opm: toNum(r.rp_opm), rp_reserve: toNum(r.rp_reserve),
    bo_beds: toNum(r.bo_beds), bo_cmi: toNum(r.bo_cmi), bo_rate: toNum(r.bo_rate),
    sa_value: toNum(r.sa_value), sa_median: toNum(r.sa_median),
  })) as RiskProfile[]
  return period_id ? normalized.filter(r => r.period_id === period_id) : normalized
}

export async function getFinancialPerformance(period_id?: string): Promise<FinancialPerformance[]> {
  const rows = await load('financial_performance')
  const normalized = rows.map(r => ({
    ...r,
    hospital_code: String(r.hospital_code),
    rev_plan: toNum(r.rev_plan), rev_actual: toNum(r.rev_actual),
    rev_pct: toNum(r.rev_pct), rev_pass: toNum(r.rev_pass),
    exp_plan: toNum(r.exp_plan), exp_actual: toNum(r.exp_actual),
    exp_pct: toNum(r.exp_pct), exp_pass: toNum(r.exp_pass),
  })) as FinancialPerformance[]
  return period_id ? normalized.filter(r => r.period_id === period_id) : normalized
}

export async function getFinancialRatios(period_id?: string): Promise<FinancialRatio[]> {
  const rows = await load('financial_ratios')
  const normalized = rows.map(r => ({
    ...r,
    hospital_code: String(r.hospital_code),
    ratio_cr: toNum(r.ratio_cr), ratio_qr: toNum(r.ratio_qr), ratio_cash: toNum(r.ratio_cash),
    ratio_nwc: toNum(r.ratio_nwc), ratio_ebitda: toNum(r.ratio_ebitda), ratio_opm: toNum(r.ratio_opm),
    ratio_roa: toNum(r.ratio_roa), ratio_im: toNum(r.ratio_im), ratio_reserve: toNum(r.ratio_reserve),
  })) as FinancialRatio[]
  return period_id ? normalized.filter(r => r.period_id === period_id) : normalized
}

export async function getQualityMetrics(period_id?: string): Promise<QualityMetric[]> {
  const rows = await load('quality_metrics')
  const normalized = rows.map(r => ({
    ...r,
    hospital_code: String(r.hospital_code),
    qm_op_cost: toNum(r.qm_op_cost), qm_op_mean: toNum(r.qm_op_mean),
    qm_ip_cost: toNum(r.qm_ip_cost), qm_ip_mean: toNum(r.qm_ip_mean),
    hgr_lc: toNum(r.hgr_lc), hgr_drug: toNum(r.hgr_drug),
    hgr_sci: toNum(r.hgr_sci), hgr_nondrug: toNum(r.hgr_nondrug),
  })) as QualityMetric[]
  return period_id ? normalized.filter(r => r.period_id === period_id) : normalized
}

export async function getIndicators(period_id?: string): Promise<Indicator[]> {
  const rows = await load('indicators')
  const normalized = rows.map(i => ({
    ...i,
    hospital_code: String(i.hospital_code),
    ind_revenue:   toNum(i.ind_revenue),
    ind_trial_bal: toNum(i.ind_trial_bal),
    ind_qm_op:     toNum(i.ind_qm_op),
    ind_qm_ip:     toNum(i.ind_qm_ip),
    ind_opm:       toNum(i.ind_opm),
    ind_roa:       toNum(i.ind_roa),
    ind_cash:      toNum(i.ind_cash),
    ind_app_d:     toNum(i.ind_app_d),
    ind_aip:       toNum(i.ind_aip),
    ind_lc:        toNum(i.ind_lc),
    ind_drug:      toNum(i.ind_drug),
    ind_sci_mat:   toNum(i.ind_sci_mat),
    ind_non_drug:  toNum(i.ind_non_drug),
    ind_acp_uc:    toNum(i.ind_acp_uc),
    ind_acp_cs:    toNum(i.ind_acp_cs),
    ind_expense:   toNum(i.ind_expense),
    ind_bed_occ:   toNum(i.ind_bed_occ),
    ind_sum_adjrw: toNum(i.ind_sum_adjrw),
    ind_ebitda:    toNum(i.ind_ebitda),
    ind_nwc:       toNum(i.ind_nwc),
  })) as Indicator[]
  return period_id ? normalized.filter(r => r.period_id === period_id) : normalized
}

// ── Computed ──────────────────────────────────────────────

export function calcGradeDist(scores: TpsScore[]): GradeDist[] {
  const order = ['A', 'B', 'C', 'D', 'F']
  const counts: Record<string, number> = {}
  for (const s of scores) {
    const g = s.grade ?? 'N/A'
    counts[g] = (counts[g] ?? 0) + 1
  }
  const total = scores.length
  return order
    .filter(g => counts[g])
    .map(g => ({ grade: g, count: counts[g], pct: Math.round((counts[g] / total) * 1000) / 10 }))
}

export function calcGradePlusDist(risks: RiskProfile[]): GradeDist[] {
  const order = ['A+','A','A-','B+','B','B-','C','D','F']
  const counts: Record<string, number> = {}
  for (const r of risks) {
    const g = r.rp_grade_plus ?? 'N/A'
    counts[g] = (counts[g] ?? 0) + 1
  }
  const total = risks.filter(r => r.rp_grade_plus).length
  return order
    .filter(g => counts[g])
    .map(g => ({ grade: g, count: counts[g], pct: Math.round((counts[g] / total) * 1000) / 10 }))
}

export function calcTrend(allScores: TpsScore[]): TrendPoint[] {
  const map: Record<string, number[]> = {}
  for (const s of allScores) {
    if (s.tps_score == null) continue
    if (!map[s.period_id]) map[s.period_id] = []
    map[s.period_id].push(s.tps_score)
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period_id, vals]) => ({
      period_id,
      avg_tps: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
      count: vals.length,
    }))
}

export function avg(vals: (number | null)[]): number {
  const nums = vals.filter((v): v is number => v != null)
  if (!nums.length) return 0
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
}
