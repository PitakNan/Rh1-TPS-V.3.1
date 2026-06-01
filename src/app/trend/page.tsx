'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  getHospitals, getPeriods, getTpsScores, getIndicators,
  getFinancialRatios, getQualityMetrics, getFinancialPerformance, getRiskProfiles,
} from '@/lib/fetchData'
import type {
  Hospital, Period, TpsScore, Indicator,
  FinancialRatio, QualityMetric, FinancialPerformance, RiskProfile,
} from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────

type Mode = 'tps' | 'indicator' | 'ratio'
type DataSource = 'tps' | 'indicator' | 'ratio' | 'quality' | 'finperf' | 'risk'
type Unit = 'score' | 'days' | 'pct' | 'ratio' | 'baht'

interface MetricDef {
  key: string       // id สำหรับ selection
  label: string
  field: string     // field จริงใน data source
  source: DataSource
  unit: Unit        // 'baht' → แกนขวา, อื่นๆ → แกนซ้าย
}

// ── ค่าคงที่ ─────────────────────────────────────────────────────────────

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']
const DASHES = ['', '6 3', '2 2', '8 3 2 3']
const MAX_HOSPITALS = 6

const TPS_METRICS: MetricDef[] = [
  { key: 'tps_score',     label: 'TPS รวม',           field: 'tps_score',     source: 'tps', unit: 'score' },
  { key: 'score_process', label: 'Process',            field: 'score_process', source: 'tps', unit: 'score' },
  { key: 'score_outcome', label: 'Outcome',            field: 'score_outcome', source: 'tps', unit: 'score' },
  { key: 'score_1_1',     label: '1.1 รายได้',         field: 'score_1_1',     source: 'tps', unit: 'score' },
  { key: 'score_1_2',     label: '1.2 ค่าใช้จ่าย',    field: 'score_1_2',     source: 'tps', unit: 'score' },
  { key: 'score_1_3',     label: '1.3 ประสิทธิภาพ',   field: 'score_1_3',     source: 'tps', unit: 'score' },
  { key: 'score_2_1',     label: '2.1',                field: 'score_2_1',     source: 'tps', unit: 'score' },
  { key: 'score_2_2',     label: '2.2',                field: 'score_2_2',     source: 'tps', unit: 'score' },
]

const INDICATOR_METRICS: MetricDef[] = [
  // ค่าจริงเป็น %
  { key: 'ind_revenue',   label: 'รายได้ vs แผน (%)',          field: 'rev_pct',        source: 'finperf',   unit: 'pct'   },
  { key: 'ind_expense',   label: 'ค่าใช้จ่าย vs แผน (%)',      field: 'exp_pct',        source: 'finperf',   unit: 'pct'   },
  // ค่าจริงเป็นวัน
  { key: 'ind_app_d',     label: 'AP Days (วัน)',               field: 'ind_app_d_val',  source: 'indicator', unit: 'days'  },
  { key: 'ind_acp_uc',    label: 'ACP UC (วัน)',                field: 'ind_acp_uc_val', source: 'indicator', unit: 'days'  },
  { key: 'ind_acp_cs',    label: 'ACP CS (วัน)',                field: 'ind_acp_cs_val', source: 'indicator', unit: 'days'  },
  { key: 'ind_aip',       label: 'Inventory (วัน)',             field: 'ind_aip_val',    source: 'indicator', unit: 'days'  },
  // ค่าจริงเป็นบาท → แกนขวา
  { key: 'ind_qm_op',     label: 'Unit Cost OP (บาท/ครั้ง)',   field: 'qm_op_cost',     source: 'quality',   unit: 'baht'  },
  { key: 'ind_qm_ip',     label: 'Unit Cost IP (บาท/adjRW)',   field: 'qm_ip_cost',     source: 'quality',   unit: 'baht'  },
  { key: 'ind_lc',        label: 'LC ค่าแรง (บาท)',            field: 'hgr_lc',         source: 'quality',   unit: 'baht'  },
  { key: 'ind_drug',      label: 'MC ยา (บาท)',                field: 'hgr_drug',       source: 'quality',   unit: 'baht'  },
  { key: 'ind_sci_mat',   label: 'MC วัสดุวิทย์ (บาท)',        field: 'hgr_sci',        source: 'quality',   unit: 'baht'  },
  { key: 'ind_non_drug',  label: 'MC เวชภัณฑ์ (บาท)',          field: 'hgr_nondrug',    source: 'quality',   unit: 'baht'  },
  // คะแนนเท่านั้น → แกนซ้าย
  { key: 'ind_trial_bal', label: 'งบทดลอง (คะแนน)',            field: 'ind_trial_bal',  source: 'indicator', unit: 'score' },
  // ค่าจริงจาก risk_profile
  { key: 'ind_bed_occ',   label: 'อัตราครองเตียง (%)',         field: 'bo_rate',        source: 'risk',      unit: 'pct'   },
  { key: 'ind_sum_adjrw', label: 'SumAdjRW (adjRW)',           field: 'sa_value',       source: 'risk',      unit: 'baht'  },
  // ค่าจริงเป็น %
  { key: 'ind_opm',       label: 'OPM (%)',                    field: 'ratio_opm',      source: 'ratio',     unit: 'pct'   },
  { key: 'ind_roa',       label: 'ROA (%)',                    field: 'ratio_roa',      source: 'ratio',     unit: 'pct'   },
  // ค่าจริงเป็นบาท → แกนขวา
  { key: 'ind_ebitda',    label: 'EBITDA (บาท)',               field: 'ratio_ebitda',   source: 'ratio',     unit: 'baht'  },
  { key: 'ind_nwc',       label: 'NWC (บาท)',                  field: 'ratio_nwc',      source: 'ratio',     unit: 'baht'  },
  // ค่า ratio → แกนซ้าย
  { key: 'ind_cash',      label: 'Cash Ratio',                 field: 'ratio_cash',     source: 'ratio',     unit: 'ratio' },
]

const RATIO_METRICS: MetricDef[] = [
  { key: 'ratio_opm',     label: 'OPM (%)',               field: 'ratio_opm',     source: 'ratio', unit: 'pct'   },
  { key: 'ratio_roa',     label: 'ROA (%)',               field: 'ratio_roa',     source: 'ratio', unit: 'pct'   },
  { key: 'ratio_cash',    label: 'Cash Ratio',            field: 'ratio_cash',    source: 'ratio', unit: 'ratio' },
  { key: 'ratio_cr',      label: 'Current Ratio',         field: 'ratio_cr',      source: 'ratio', unit: 'ratio' },
  { key: 'ratio_qr',      label: 'Quick Ratio',           field: 'ratio_qr',      source: 'ratio', unit: 'ratio' },
  { key: 'ratio_im',      label: 'Inventory (วัน)',       field: 'ratio_im',      source: 'ratio', unit: 'days'  },
  { key: 'ratio_nwc',     label: 'NWC (บาท)',             field: 'ratio_nwc',     source: 'ratio', unit: 'baht'  },
  { key: 'ratio_ebitda',  label: 'EBITDA (บาท)',          field: 'ratio_ebitda',  source: 'ratio', unit: 'baht'  },
  { key: 'ratio_reserve', label: 'Reserve (บาท)',         field: 'ratio_reserve', source: 'ratio', unit: 'baht'  },
]

const MODE_METRICS: Record<Mode, MetricDef[]> = {
  tps: TPS_METRICS, indicator: INDICATOR_METRICS, ratio: RATIO_METRICS,
}
const MODE_DEFAULT: Record<Mode, string> = {
  tps: 'tps_score', indicator: 'ind_revenue', ratio: 'ratio_opm',
}

const UNIT_LABEL: Record<Unit, string> = {
  score: 'คะแนน', days: 'วัน', pct: '%', ratio: 'ratio', baht: 'บาท',
}

// ── Component ─────────────────────────────────────────────────────────────

import { Suspense } from 'react'

function TrendContent() {
  // Data
  const [hospitals, setHospitals]         = useState<Hospital[]>([])
  const [periods, setPeriods]             = useState<Period[]>([])
  const [scores, setScores]               = useState<TpsScore[]>([])
  const [indicators, setIndicators]       = useState<Indicator[]>([])
  const [ratios, setRatios]               = useState<FinancialRatio[]>([])
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetric[]>([])
  const [financialPerfs, setFinancialPerfs] = useState<FinancialPerformance[]>([])
  const [riskProfiles, setRiskProfiles]     = useState<RiskProfile[]>([])
  const [loading, setLoading]             = useState(true)
  const [modeLoading, setModeLoading]     = useState(false)

  // UI
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([])
  const [searchText, setSearchText]               = useState('')
  const [showDropdown, setShowDropdown]           = useState(false)
  const [mode, setMode]                           = useState<Mode>('tps')
  const [selectedMetrics, setSelectedMetrics]     = useState<string[]>(['tps_score'])
  const searchRef   = useRef<HTMLDivElement>(null)
  const loadedSources = useRef<Set<string>>(new Set(['tps']))
  const searchParams = useSearchParams()
  const preloadCode = searchParams.get('code')

  // ── Load รอบแรก ──
  useEffect(() => {
    Promise.all([getHospitals(), getPeriods(), getTpsScores()])
      .then(([h, p, s]) => {
        setHospitals(h); setPeriods(p); setScores(s); setLoading(false)
        // auto-select จาก URL ?code=
        if (preloadCode) {
          const found = h.find(x => x.hospital_code === preloadCode)
          if (found) setSelectedHospitals([preloadCode])
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load on-demand ──
  useEffect(() => {
    setSelectedMetrics([MODE_DEFAULT[mode]])

    if (mode === 'indicator' && !loadedSources.current.has('indicator_full')) {
      setModeLoading(true)
      Promise.all([getIndicators(), getFinancialRatios(), getQualityMetrics(), getFinancialPerformance(), getRiskProfiles()])
        .then(([ind, rat, qm, fp, rp]) => {
          setIndicators(ind); setRatios(rat); setQualityMetrics(qm); setFinancialPerfs(fp); setRiskProfiles(rp)
          setModeLoading(false)
          loadedSources.current.add('indicator_full')
          loadedSources.current.add('ratio')
        })
    }
    if (mode === 'ratio' && !loadedSources.current.has('ratio')) {
      setModeLoading(true)
      getFinancialRatios().then(d => {
        setRatios(d); setModeLoading(false); loadedSources.current.add('ratio')
      })
    }
  }, [mode])

  // ── Helpers ──
  const hospMap = useMemo(() => {
    const m = new Map<string, Hospital>()
    hospitals.forEach(h => m.set(h.hospital_code, h))
    return m
  }, [hospitals])

  const currentMetrics = MODE_METRICS[mode]

  const getMetricDef = (key: string) => currentMetrics.find(m => m.key === key)

  const isRightAxis = (key: string) => getMetricDef(key)?.unit === 'baht'

  const searchResults = useMemo(() => {
    if (!searchText.trim()) return []
    const q = searchText.toLowerCase()
    return hospitals
      .filter(h => !selectedHospitals.includes(h.hospital_code) &&
        (h.hospital_name.toLowerCase().includes(q) || h.hospital_code.includes(q)))
      .slice(0, 10)
  }, [hospitals, searchText, selectedHospitals])

  const addHospital = (code: string) => {
    if (selectedHospitals.length >= MAX_HOSPITALS) return
    setSelectedHospitals(p => [...p, code])
    setSearchText(''); setShowDropdown(false)
  }
  const removeHospital = (code: string) => setSelectedHospitals(p => p.filter(c => c !== code))
  const toggleMetric = (key: string) =>
    setSelectedMetrics(p => p.includes(key) ? (p.length > 1 ? p.filter(k => k !== key) : p) : [...p, key])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // ── สร้างข้อมูลกราฟ ──
  const chartData = useMemo(() => {
    if (!selectedHospitals.length || !selectedMetrics.length) return []

    const getRows = (src: DataSource): Record<string, unknown>[] => {
      if (src === 'tps')       return scores as Record<string, unknown>[]
      if (src === 'indicator') return indicators as Record<string, unknown>[]
      if (src === 'ratio')     return ratios as Record<string, unknown>[]
      if (src === 'quality')   return qualityMetrics as Record<string, unknown>[]
      if (src === 'risk')      return riskProfiles as Record<string, unknown>[]
      return financialPerfs as Record<string, unknown>[]
    }

    const lookup = new Map<string, Map<string, number | null>>()
    selectedHospitals.forEach(code =>
      selectedMetrics.forEach(m => lookup.set(`${code}__${m}`, new Map()))
    )

    selectedMetrics.forEach(m => {
      const def = getMetricDef(m)
      if (!def) return
      getRows(def.source).forEach(row => {
        const code = row.hospital_code as string
        if (!selectedHospitals.includes(code)) return
        const v = row[def.field]
        lookup.get(`${code}__${m}`)?.set(
          row.period_id as string,
          v != null ? Number(v) : null
        )
      })
    })

    return periods.map(p => {
      const row: Record<string, unknown> = {
        period_id: p.period_id,
        label: `Q${p.quarter}/${String(p.year).slice(2)}`,
      }
      selectedHospitals.forEach(code =>
        selectedMetrics.forEach(m => {
          row[`${code}__${m}`] = lookup.get(`${code}__${m}`)?.get(p.period_id) ?? null
        })
      )
      return row
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHospitals, selectedMetrics, mode, periods, scores, indicators, ratios, qualityMetrics, financialPerfs, riskProfiles])

  // ── Line definitions ──
  const lines = useMemo(() => {
    return selectedHospitals.flatMap((code, hi) =>
      selectedMetrics.map((m, mi) => {
        const h   = hospMap.get(code)
        const def = getMetricDef(m)
        const mLabel   = def?.label ?? m
        const hospLabel = h?.hospital_name ?? code
        return {
          dataKey: `${code}__${m}`,
          color:   COLORS[hi % COLORS.length],
          dash:    DASHES[mi % DASHES.length],
          label:   selectedMetrics.length > 1 ? `${hospLabel} · ${mLabel}` : hospLabel,
          yAxisId: isRightAxis(m) ? 'right' : 'left',
        }
      })
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHospitals, selectedMetrics, hospMap, currentMetrics])

  const hasRightAxis = selectedMetrics.some(m => isRightAxis(m))

  const fmtVal = (v: number) => {
    if (Math.abs(v) >= 1e8) return `${(v / 1e6).toFixed(0)}M`
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`
    if (Math.abs(v) >= 1e4) return `${(v / 1e3).toFixed(0)}K`
    return v % 1 === 0 ? String(v) : v.toFixed(2)
  }

  // หน่วยของแกน
  const leftUnit  = selectedMetrics.find(m => !isRightAxis(m))
  const rightUnit = selectedMetrics.find(m => isRightAxis(m))
  const leftLabel  = leftUnit  ? UNIT_LABEL[getMetricDef(leftUnit)?.unit  ?? 'score'] : ''
  const rightLabel = rightUnit ? UNIT_LABEL[getMetricDef(rightUnit)?.unit ?? 'baht']  : ''

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 shadow-xl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>📈</div>
            <div>
              <h1 className="text-xl font-bold leading-tight text-white">TPS Dashboard</h1>
              <p className="text-xs" style={{ color: '#f59e0b' }}>เปรียบเทียบแนวโน้มรายโรงพยาบาล</p>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <a href="/" className="px-3 py-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition">ภาพรวม</a>
            <span className="px-3 py-1.5 rounded-md font-semibold text-white" style={{ background: 'rgba(245,158,11,0.25)', border: '1px solid rgba(245,158,11,0.4)' }}>Trend</span>
            <a href="/hospital" className="px-3 py-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition">รายโรงพยาบาล</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* ── เลือกโรงพยาบาล ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }} />
            <h2 className="text-base font-semibold text-slate-800">เลือกโรงพยาบาล</h2>
            <span className="text-xs text-slate-400">สูงสุด {MAX_HOSPITALS} แห่ง</span>
            {selectedHospitals.length > 0 && (
              <button onClick={() => setSelectedHospitals([])} className="ml-auto text-xs text-slate-400 hover:text-red-500 transition">ล้างทั้งหมด</button>
            )}
          </div>
          <div ref={searchRef} className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔍</span>
            <input type="text" value={searchText}
              onChange={e => { setSearchText(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              placeholder={selectedHospitals.length >= MAX_HOSPITALS ? `เลือกครบ ${MAX_HOSPITALS} แห่งแล้ว` : 'ค้นหาชื่อหรือรหัสโรงพยาบาล...'}
              disabled={selectedHospitals.length >= MAX_HOSPITALS}
              className="w-full text-sm border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {searchResults.map(h => (
                  <button key={h.hospital_code} onMouseDown={e => { e.preventDefault(); addHospital(h.hospital_code) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 w-14 shrink-0">{h.hospital_code}</span>
                    <span className="text-sm text-slate-700 flex-1 truncate">{h.hospital_name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{h.province}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{h.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedHospitals.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedHospitals.map((code, i) => {
                const h = hospMap.get(code)
                return (
                  <div key={code} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-sm text-white shadow-sm"
                    style={{ background: COLORS[i % COLORS.length] }}>
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                    <span className="font-medium max-w-[200px] truncate">{h?.hospital_name ?? code}</span>
                    <span className="text-white/60 text-xs">{h?.province}</span>
                    <button onClick={() => removeHospital(code)}
                      className="ml-1 w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 transition flex items-center justify-center text-xs">×</button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-2">ค้นหาและเลือกโรงพยาบาลที่ต้องการเปรียบเทียบ</p>
          )}
        </div>

        {/* ── Mode + Metric chips ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm">
              {([['tps', 'TPS คะแนนรวม'], ['indicator', 'ตัวชี้วัดย่อย'], ['ratio', 'อัตราส่วนการเงิน']] as [Mode, string][]).map(([m, label]) => (
                <div key={m} className="flex items-stretch">
                  <button onClick={() => setMode(m)}
                    className={`px-4 py-2 font-medium transition ${mode === m ? 'text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    style={mode === m ? { background: 'linear-gradient(135deg, #0f172a, #334155)' } : {}}>
                    {label}
                  </button>
                  {mode === m && (
                    <button
                      onClick={() => setSelectedMetrics([MODE_DEFAULT[mode]])}
                      title="Reset ตัวชี้วัด"
                      className="px-2 text-white/60 hover:text-white hover:bg-white/10 transition border-l border-white/20 text-xs"
                      style={{ background: 'linear-gradient(135deg, #0f172a, #334155)' }}
                    >
                      ↺
                    </button>
                  )}
                </div>
              ))}
            </div>
            {modeLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>กำลังโหลด...</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-4 text-xs text-slate-400">
              <span><span className="inline-block w-6 h-0.5 bg-slate-400 mr-1 align-middle" />แกนซ้าย: คะแนน / วัน / %</span>
              <span><span className="inline-block w-6 h-0.5 bg-amber-500 mr-1 align-middle" />แกนขวา: บาท</span>
            </div>
          </div>

          {/* Metric chips */}
          <div className="flex flex-wrap gap-2">
            {currentMetrics.map(m => {
              const isSelected = selectedMetrics.includes(m.key)
              const isBaht = m.unit === 'baht'
              return (
                <button key={m.key} onClick={() => toggleMetric(m.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isSelected ? 'text-white border-transparent shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  style={isSelected ? {
                    background: isBaht
                      ? 'linear-gradient(135deg, #92400e, #d97706)'
                      : 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                  } : {}}>
                  {isSelected && <span className="mr-1">{isBaht ? '→' : '←'}</span>}
                  {m.label}
                </button>
              )
            })}
          </div>

          {selectedMetrics.length > 0 && (
            <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1 border-t border-slate-50">
              {!hasRightAxis
                ? <span>ตัวชี้วัดทั้งหมดใช้แกนซ้าย ({leftLabel})</span>
                : <>
                    <span className="text-blue-600">แกนซ้าย ({leftLabel}): {selectedMetrics.filter(m => !isRightAxis(m)).map(m => getMetricDef(m)?.label).join(', ') || '–'}</span>
                    <span className="text-amber-600">แกนขวา ({rightLabel}): {selectedMetrics.filter(m => isRightAxis(m)).map(m => getMetricDef(m)?.label).join(', ')}</span>
                  </>
              }
            </div>
          )}
        </div>

        {/* ── กราฟ ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }} />
            <h2 className="text-base font-semibold text-slate-800">
              {selectedMetrics.map(k => getMetricDef(k)?.label ?? k).join(' vs ')}
            </h2>
            <span className="ml-auto text-xs text-slate-400">{periods.length} ไตรมาส · 2563Q4–2569Q2</span>
          </div>

          {selectedHospitals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-300">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-sm font-medium">เลือกโรงพยาบาลเพื่อดูกราฟแนวโน้ม</p>
            </div>
          ) : modeLoading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">กำลังโหลดข้อมูล...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={chartData} margin={{ top: 8, right: hasRightAxis ? 72 : 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} angle={-45} textAnchor="end" height={65} />
                <YAxis
                  yAxisId="left" orientation="left"
                  tick={{ fontSize: 11, fill: '#64748b' }} width={62}
                  tickFormatter={fmtVal}
                  label={leftLabel ? { value: leftLabel, angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: '#94a3b8' } } : undefined}
                />
                {hasRightAxis && (
                  <YAxis
                    yAxisId="right" orientation="right"
                    tick={{ fontSize: 11, fill: '#d97706' }} width={68}
                    tickFormatter={fmtVal}
                    label={{ value: 'บาท', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: 11, fill: '#d97706' } }}
                  />
                )}
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}
                  formatter={(value: unknown, name: string) => {
                    const def = lines.find(l => l.dataKey === name)
                    return [value != null ? fmtVal(Number(value)) : '–', def?.label ?? name]
                  }}
                />
                <Legend
                  formatter={value => { const def = lines.find(l => l.dataKey === value); return <span style={{ fontSize: 11 }}>{def?.label ?? value}</span> }}
                  wrapperStyle={{ paddingTop: 12 }}
                />
                {lines.map(l => (
                  <Line key={l.dataKey} yAxisId={l.yAxisId} type="monotone" dataKey={l.dataKey}
                    stroke={l.color} strokeWidth={2} strokeDasharray={l.dash}
                    dot={{ r: 2.5, strokeWidth: 0, fill: l.color }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

      </main>

      <footer className="text-center py-6 text-xs border-t mt-4" style={{ background: '#0f172a', color: '#64748b', borderColor: '#1e293b' }}>
        <span style={{ color: '#f59e0b' }}>TPS Dashboard</span>
        <span className="mx-2">|</span>
        ข้อมูล 903 โรงพยาบาล 23 ไตรมาส (2563Q4–2569Q2)
      </footer>
    </div>
  )
}

export default function TrendPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TrendContent />
    </Suspense>
  )
}
