'use client'

import { useState, useEffect, useMemo } from 'react'
import { getHospitals, getPeriods, getTpsScores, getIndicators } from '@/lib/fetchData'
import type { Hospital, Period, TpsScore, Indicator } from '@/lib/types'

// ── ค่าคงที่ ──────────────────────────────────────────────

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  A: { label: 'A', color: 'text-green-700',  bg: 'bg-green-50',  bar: 'bg-green-500' },
  B: { label: 'B', color: 'text-blue-700',   bg: 'bg-blue-50',   bar: 'bg-blue-500' },
  C: { label: 'C', color: 'text-yellow-700', bg: 'bg-yellow-50', bar: 'bg-yellow-400' },
  D: { label: 'D', color: 'text-orange-700', bg: 'bg-orange-50', bar: 'bg-orange-500' },
  F: { label: 'F', color: 'text-red-700',    bg: 'bg-red-50',    bar: 'bg-red-500' },
}

const IND_CONFIG: { key: string; label: string; source: 'indicator' | 'finperf'; binaryOnly?: boolean }[] = [
  { key: 'ind_revenue',   label: 'มิติรายได้ ±ไม่เกิน 5%',                                                  source: 'indicator' },
  { key: 'ind_expense',   label: 'มิติค่าใช้จ่าย ±ไม่เกิน 5%',                                              source: 'indicator', binaryOnly: true },
  { key: 'ind_app_d',     label: 'AP Days ≤90/180 วัน',                                                     source: 'indicator' },
  { key: 'ind_acp_uc',    label: 'ACP:UC ≤60 วัน',                                                          source: 'indicator' },
  { key: 'ind_acp_cs',    label: 'ACP:CS ≤60 วัน',                                                          source: 'indicator' },
  { key: 'ind_aip',       label: 'AIP ≤60/90 วัน',                                                          source: 'indicator' },
  { key: 'ind_qm_op',     label: 'Unit Cost for OP',                                                        source: 'indicator' },
  { key: 'ind_qm_ip',     label: 'Unit Cost for IP',                                                        source: 'indicator' },
  { key: 'ind_lc',        label: 'LC ค่าแรงบุคลากร',                                                        source: 'indicator' },
  { key: 'ind_drug',      label: 'MC ค่ายา',                                                                source: 'indicator' },
  { key: 'ind_sci_mat',   label: 'MC ค่าวัสดุวิทยาศาสตร์และการแพทย์',                                      source: 'indicator' },
  { key: 'ind_non_drug',  label: 'MC ค่าเวชภัณฑ์มิใช่ยาและวัสดุการแพทย์',                                  source: 'indicator' },
  { key: 'ind_trial_bal', label: 'คะแนนตรวจสอบงบทดลองเบื้องต้น',                                           source: 'indicator' },
  { key: 'ind_bed_occ',   label: 'อัตราครองเตียงผู้ป่วยใน ≥80%',                                           source: 'indicator' },
  { key: 'ind_sum_adjrw', label: 'Sum AdjRW เกินค่ากลางกลุ่มรพ./+5%',                                      source: 'indicator' },
  { key: 'ind_opm',       label: 'ประสิทธิภาพในการดำเนินงาน (OPM)',                                         source: 'indicator' },
  { key: 'ind_roa',       label: 'อัตราผลตอบแทนจากสินทรัพย์ (ROA)',                                         source: 'indicator' },
  { key: 'ind_ebitda',    label: 'EBITDA ≥0',                                                               source: 'indicator' },
  { key: 'ind_nwc',       label: 'ทุนสำรองสุทธิ (NWC) ≥0',                                                  source: 'indicator' },
  { key: 'ind_cash',      label: 'Cash Ratio ≥0.8',                                                         source: 'indicator' },
]

const HOSPITAL_TYPES = ['A', 'S', 'M1', 'M2', 'F1', 'F2', 'F3']

// ── Component หลัก ────────────────────────────────────────

export default function OverviewPage() {
  const [hospitals, setHospitals]   = useState<Hospital[]>([])
  const [periods, setPeriods]       = useState<Period[]>([])
  const [scores, setScores]         = useState<TpsScore[]>([])
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [loading, setLoading]       = useState(true)
  const [indLoading, setIndLoading] = useState(true)

  // Filters
  const [selectedPeriod, setSelectedPeriod]     = useState('2569Q2')
  const [selectedZone, setSelectedZone]         = useState('1')
  const [selectedType, setSelectedType]         = useState('all')
  const [selectedProvince, setSelectedProvince] = useState('all')

  // Modal
  const [modal, setModal] = useState<{ title: string; subtitle: string; rows: { code: string; name: string; province: string; type: string; extra?: string }[] } | null>(null)
  const closeModal = () => setModal(null)

  // รอบ 1: โหลด hospitals + periods + tps_scores (แสดงผลหลักก่อน)
  useEffect(() => {
    Promise.all([getHospitals(), getPeriods(), getTpsScores()])
      .then(([h, p, s]) => {
        setHospitals(h)
        setPeriods(p)
        setScores(s)
        // ถ้าไม่มี 2569Q2 ในข้อมูล ให้ fallback เป็นไตรมาสล่าสุด
        const hasDefault = p.some(x => x.period_id === '2569Q2')
        if (!hasDefault) {
          const latest = [...p].sort((a, b) => b.period_id.localeCompare(a.period_id))[0]
          if (latest) setSelectedPeriod(latest.period_id)
        }
        setLoading(false)

        // รอบ 2: โหลด indicators แยก (ไฟล์ใหญ่ 14MB)
        getIndicators().then(ind => {
          setIndicators(ind)
          setIndLoading(false)
        })
      })
      .catch(() => setLoading(false))
  }, [])

  // จังหวัดที่มีในเขต/ประเภทที่เลือก (สำหรับ dropdown จังหวัด)
  const availableProvinces = useMemo(() => {
    const set = new Set<string>()
    hospitals.forEach(h => {
      if (selectedZone !== 'all' && parseInt(String(h.zone)) !== parseInt(selectedZone)) return
      if (selectedType !== 'all' && h.type !== selectedType) return
      if (h.province) set.add(h.province)
    })
    return [...set].sort((a, b) => a.localeCompare(b, 'th'))
  }, [hospitals, selectedZone, selectedType])

  // reset จังหวัดเมื่อเขต/ประเภทเปลี่ยน
  useEffect(() => { setSelectedProvince('all') }, [selectedZone, selectedType])

  // hospital lookup
  const hospMap = useMemo(() => {
    const m = new Map<string, Hospital>()
    hospitals.forEach(h => m.set(h.hospital_code, h))
    return m
  }, [hospitals])

  // กรองโรงพยาบาลตาม zone + type + province
  const filteredCodes = useMemo(() => {
    return new Set(
      hospitals
        .filter(h => {
          if (selectedZone !== 'all' && parseInt(String(h.zone)) !== parseInt(selectedZone)) return false
          if (selectedType !== 'all' && h.type !== selectedType) return false
          if (selectedProvince !== 'all' && h.province !== selectedProvince) return false
          return true
        })
        .map(h => h.hospital_code)
    )
  }, [hospitals, selectedZone, selectedType, selectedProvince])

  // กรอง scores ตาม period + filteredCodes
  const filteredScores = useMemo(() =>
    scores.filter(s => s.period_id === selectedPeriod && filteredCodes.has(s.hospital_code)),
    [scores, selectedPeriod, filteredCodes]
  )

  // กรอง indicators ตาม period + filteredCodes
  const filteredInds = useMemo(() =>
    indicators.filter(i => i.period_id === selectedPeriod && filteredCodes.has(i.hospital_code)),
    [indicators, selectedPeriod, filteredCodes]
  )

  // ── คำนวณ metrics ──

  const gradeOrder = ['A', 'B', 'C', 'D', 'F']
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredScores.forEach(s => {
      if (s.grade) counts[s.grade] = (counts[s.grade] ?? 0) + 1
    })
    return counts
  }, [filteredScores])

  const totalHosp   = filteredScores.length
  const passCount   = (gradeCounts['A'] ?? 0) + (gradeCounts['B'] ?? 0)
  const passPct     = totalHosp > 0 ? (passCount / totalHosp * 100).toFixed(1) : '0'
  const avgTps      = useMemo(() => {
    const vals = filteredScores.filter(s => s.tps_score != null).map(s => s.tps_score!)
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '-'
  }, [filteredScores])

  // pass rate แต่ละตัวชี้วัด (เรียงตามลำดับ TPS)
  const indPassRates = useMemo(() => {
    return IND_CONFIG.map(({ key, label, binaryOnly }) => {
      const k = key as keyof Indicator
      // binaryOnly=true → กรองเฉพาะ 0/1 (ตัดช่วงที่เก็บค่าจริงเป็นบาทออก)
      const rows = filteredInds.filter(i => {
        const v = i[k]
        return binaryOnly ? (v === 0 || v === 1) : v != null
      })
      const pass = rows.filter(i => (i[k] as number) > 0).length
      const pct  = rows.length > 0 ? (pass / rows.length * 100) : null
      return { key, label, pass, total: rows.length, pct }
    }).filter(r => r.total > 0)
  }, [filteredInds])

  // ── Escape key ปิด modal ──
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Open modal functions ──
  const openGradeModal = (grade: string) => {
    const rows = filteredScores
      .filter(s => s.grade === grade)
      .map(s => {
        const h = hospMap.get(s.hospital_code)
        return { code: s.hospital_code, name: h?.hospital_name ?? s.hospital_code, province: h?.province ?? '–', type: h?.type ?? '–', extra: `TPS: ${s.tps_score?.toFixed(2) ?? '–'}` }
      })
      .sort((a, b) => a.province.localeCompare(b.province, 'th') || a.name.localeCompare(b.name, 'th'))
    setModal({ title: `เกรด ${grade}`, subtitle: `${rows.length} โรงพยาบาล`, rows })
  }

  const openIndModal = (key: string, label: string, binaryOnly?: boolean) => {
    const k = key as keyof Indicator
    const rows = filteredInds
      .filter(i => {
        const v = i[k] as number | null
        if (binaryOnly && v != null && v !== 0 && v !== 1) return false
        return v != null && v > 0
      })
      .map(i => {
        const h = hospMap.get(i.hospital_code)
        return { code: i.hospital_code, name: h?.hospital_name ?? i.hospital_code, province: h?.province ?? '–', type: h?.type ?? '–', extra: `คะแนน: ${i[k]}` }
      })
      .sort((a, b) => a.province.localeCompare(b.province, 'th') || a.name.localeCompare(b.name, 'th'))
    setModal({ title: label, subtitle: `ผ่าน ${rows.length} โรงพยาบาล`, rows })
  }

  const openProvinceModal = (province: string) => {
    const rows = filteredScores
      .filter(s => hospMap.get(s.hospital_code)?.province === province)
      .map(s => {
        const h = hospMap.get(s.hospital_code)
        return { code: s.hospital_code, name: h?.hospital_name ?? s.hospital_code, province: province, type: h?.type ?? '–', extra: `${s.grade ?? '–'} | TPS: ${s.tps_score?.toFixed(2) ?? '–'}` }
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'th'))
    setModal({ title: province, subtitle: `${rows.length} โรงพยาบาล`, rows })
  }

  // pass rate แยกตามจังหวัด
  const provinceData = useMemo(() => {
    const map: Record<string, { pass: number; total: number; sumTps: number }> = {}
    filteredScores.forEach(s => {
      const h = hospMap.get(s.hospital_code)
      if (!h) return
      if (!map[h.province]) map[h.province] = { pass: 0, total: 0, sumTps: 0 }
      map[h.province].total++
      if (s.grade === 'A' || s.grade === 'B') map[h.province].pass++
      if (s.tps_score != null) map[h.province].sumTps += s.tps_score
    })
    return Object.entries(map)
      .map(([province, d]) => ({
        province,
        total: d.total,
        pass: d.pass,
        pct: d.total > 0 ? (d.pass / d.total * 100) : 0,
        avgTps: d.total > 0 ? (d.sumTps / d.total) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
  }, [filteredScores, hospMap])

  const maxGrade = Math.max(...gradeOrder.map(g => gradeCounts[g] ?? 0), 1)

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
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              🏥
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight text-white">TPS Dashboard</h1>
              <p className="text-xs" style={{ color: '#f59e0b' }}>ระบบ Monitor ผลการดำเนินงานโรงพยาบาล</p>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <span className="px-3 py-1.5 rounded-md font-semibold text-white" style={{ background: 'rgba(245,158,11,0.25)', border: '1px solid rgba(245,158,11,0.4)' }}>ภาพรวม</span>
            <a href="/trend" className="px-3 py-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition">Trend</a>
            <a href="/hospital" className="px-3 py-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition">รายโรงพยาบาล</a>
          </nav>
        </div>
      </header>

      {/* ── Filter bar ── */}
      <div className="sticky z-40 bg-white border-b shadow-sm" style={{ top: '72px', borderColor: '#e2e8f0' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap gap-3 items-center">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#0f172a' }}>กรองข้อมูล</span>

          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {[...periods].reverse().map(p => (
              <option key={p.period_id} value={p.period_id}>
                ไตรมาส {p.quarter}/{p.year}
              </option>
            ))}
          </select>

          <select
            value={selectedZone}
            onChange={e => setSelectedZone(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">ทุกเขตสุขภาพ</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(z => (
              <option key={z} value={String(z)}>เขต {z}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">ทุกประเภท</option>
            {HOSPITAL_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={selectedProvince}
            onChange={e => setSelectedProvince(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">ทุกจังหวัด</option>
            {availableProvinces.map(pv => (
              <option key={pv} value={pv}>{pv}</option>
            ))}
          </select>

          {(selectedZone !== 'all' || selectedType !== 'all' || selectedProvince !== 'all') && (
            <button
              onClick={() => { setSelectedZone('all'); setSelectedType('all'); setSelectedProvince('all') }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              ล้างตัวกรอง
            </button>
          )}

          <span className="ml-auto text-xs text-slate-400">
            แสดง {totalHosp.toLocaleString()} โรงพยาบาล
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Narrative Insight ── */}
        {!loading && (
          <NarrativeInsight
            totalHosp={totalHosp}
            passPct={parseFloat(passPct)}
            passCount={passCount}
            gradeCounts={gradeCounts}
            indPassRates={indPassRates}
            provinceData={provinceData}
            periodLabel={(() => { const p = periods.find(x => x.period_id === selectedPeriod); return p ? `ไตรมาส ${p.quarter}/${p.year}` : selectedPeriod })()}
            zoneLabel={selectedZone === 'all' ? 'ทุกเขตสุขภาพ' : `เขตสุขภาพ ${selectedZone}`}
            indLoading={indLoading}
          />
        )}

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon="🏥" label="โรงพยาบาลทั้งหมด" value={totalHosp.toLocaleString()} sub="แห่ง" color="navy" />
          <SummaryCard icon="✅" label="ผ่านเกณฑ์ (A+B)" value={`${passPct}%`} sub={`${passCount} แห่ง`} color="gold" />
          <SummaryCard icon="📊" label="คะแนน TPS เฉลี่ย" value={avgTps} sub="คะแนน" color="blue" />
          <SummaryCard icon="🏆" label="เกรด A" value={(gradeCounts['A'] ?? 0).toLocaleString()} sub="โรงพยาบาล" color="amber" />
        </div>

        {/* ── Grade Distribution ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }} />
            <h2 className="text-base font-semibold text-slate-800">เกรด</h2>
            <span className="text-xs text-slate-400 ml-1">คลิกเพื่อดูรายชื่อ รพ.</span>
          </div>
          <div className="space-y-3">
            {gradeOrder.map(grade => {
              const count = gradeCounts[grade] ?? 0
              const pct   = totalHosp > 0 ? (count / totalHosp * 100) : 0
              const cfg   = GRADE_CONFIG[grade]
              return (
                <div key={grade} className="flex items-center gap-3 cursor-pointer rounded-lg px-1 hover:bg-slate-50 transition" onClick={() => count > 0 && openGradeModal(grade)}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${cfg.bg} ${cfg.color} flex-shrink-0`}>
                    {grade}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">{count.toLocaleString()} แห่ง</span>
                      <span className={`text-xs font-semibold ${cfg.color}`}>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${cfg.bar} rounded-full transition-all duration-500`}
                        style={{ width: `${(count / maxGrade) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* A+B highlight */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-600">อัตราผ่านเกณฑ์ <span className="font-semibold">(A+B)</span></span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${passPct}%`, background: 'linear-gradient(to right, #f59e0b, #3b82f6)' }} />
              </div>
              <span className="text-lg font-bold" style={{ color: '#0f172a' }}>{passPct}%</span>
            </div>
          </div>
        </div>

        {/* ── Indicator Pass Rate ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }} />
            <h2 className="text-base font-semibold text-slate-800">อัตราผ่านตัวชี้วัดย่อย</h2>
          </div>
          <p className="text-xs text-slate-400 mb-5 ml-3">เรียงตามลำดับตัวชี้วัดในตาราง TPS · คลิกเพื่อดูรายชื่อ รพ. ที่ผ่าน</p>

          {indLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">กำลังโหลดตัวชี้วัด...</span>
            </div>
          ) : indPassRates.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">ไม่มีข้อมูลตัวชี้วัดในช่วงเวลานี้</p>
          ) : (
            <div className="space-y-2.5">
              {indPassRates.map(({ key, label, pass, total, pct }) => {
                const pctVal = pct ?? 0
                const rowBg  = pctVal >= 60 ? 'bg-green-50'  : pctVal >= 50 ? 'bg-yellow-50'  : ''
                const barColor = pctVal >= 60 ? 'bg-green-500' : pctVal >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                const pctColor = pctVal >= 60 ? 'text-green-700' : pctVal >= 50 ? 'text-yellow-700' : 'text-red-600'
                return (
                  <div key={String(key)} className={`flex items-center gap-3 rounded-lg px-2 py-1 cursor-pointer hover:brightness-95 transition ${rowBg}`} onClick={() => { const cfg = IND_CONFIG.find(c => c.key === key); openIndModal(key, label, cfg?.binaryOnly) }}>
                    <span className="text-xs text-slate-600 w-44 flex-shrink-0 leading-tight">{label}</span>
                    <div className="flex-1">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pctVal}%` }} />
                      </div>
                    </div>
                    <span className={`text-xs font-semibold w-12 text-right ${pctColor}`}>{pctVal.toFixed(1)}%</span>
                    <span className="text-xs text-slate-400 w-20 text-right">{pass}/{total}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Province Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }} />
            <h2 className="text-base font-semibold text-slate-800">
              อัตราผ่านเกณฑ์ รายจังหวัด
              <span className="ml-2 text-xs font-normal text-slate-400">({provinceData.length} จังหวัด)</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">จังหวัด</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">รพ.ทั้งหมด</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">A+B</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ผ่าน %</th>
                  <th className="text-center py-2 pl-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">เฉลี่ย TPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {provinceData.map(({ province, total, pass, pct, avgTps }) => {
                  const rowBg   = pct >= 60 ? 'bg-green-50'  : pct >= 50 ? 'bg-yellow-50'  : ''
                  const badgeCls = pct >= 60 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  return (
                    <tr key={province} className={`transition cursor-pointer ${rowBg} hover:brightness-95`} onClick={() => openProvinceModal(province)}>
                      <td className="py-2 pr-4 font-medium text-slate-700 flex items-center gap-1">{province}<span className="text-slate-300 text-xs">›</span></td>
                      <td className="py-2 px-3 text-center text-slate-600">{total}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-green-700 font-semibold">{pass}</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badgeCls}`}>
                          {pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 pl-3 text-center text-slate-600">{avgTps.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <footer className="text-center py-6 text-xs border-t mt-4" style={{ background: '#0f172a', color: '#64748b', borderColor: '#1e293b' }}>
        <span style={{ color: '#f59e0b' }}>TPS Dashboard</span>
        <span className="mx-2">|</span>
        ข้อมูล 903 โรงพยาบาล 23 ไตรมาส (2563Q4–2569Q2)
      </footer>

      {/* ── Drill-down Modal ── */}
      {modal && <DrillModal {...modal} onClose={closeModal} />}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

function DrillModal({ title, subtitle, rows, onClose }: {
  title: string; subtitle: string
  rows: { code: string; name: string; province: string; type: string; extra?: string }[]
  onClose: () => void
}) {
  // จัดกลุ่มตามจังหวัด
  const grouped: { province: string; items: typeof rows }[] = []
  rows.forEach(r => {
    const last = grouped[grouped.length - 1]
    if (!last || last.province !== r.province) grouped.push({ province: r.province, items: [r] })
    else last.items.push(r)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs mt-0.5" style={{ color: '#f59e0b' }}>{subtitle}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center text-white text-lg leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-3">
          {grouped.map(({ province, items }) => (
            <div key={province}>
              {/* Province divider */}
              <div className="sticky top-0 bg-blue-50 border-y border-blue-100 px-2 py-1 flex items-center gap-2 my-1 z-10">
                <span className="text-xs font-bold text-blue-700">📍 {province}</span>
                <span className="text-xs text-blue-400">({items.length} แห่ง)</span>
              </div>
              {/* Hospital rows */}
              {items.map((r, i) => (
                <a key={r.code} href={`/trend?code=${r.code}`} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer group transition hover:bg-blue-50 ${i % 2 === 1 ? 'bg-slate-50' : ''}`}>
                  <span className="text-xs font-mono text-slate-400 w-14 shrink-0">{r.code}</span>
                  <span className="text-sm text-slate-700 flex-1 leading-tight group-hover:text-blue-700 group-hover:underline">{r.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{r.type}</span>
                  {r.extra && <span className="text-xs text-slate-500 shrink-0">{r.extra}</span>}
                  <span className="text-slate-300 group-hover:text-blue-400 text-xs shrink-0">↗</span>
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 text-right">
          <button onClick={onClose} className="text-xs px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition">ปิด</button>
        </div>
      </div>
    </div>
  )
}

// ── Narrative Insight ─────────────────────────────────────────

function NarrativeInsight({
  totalHosp, passPct, passCount, gradeCounts,
  indPassRates, provinceData, periodLabel, zoneLabel, indLoading,
}: {
  totalHosp: number
  passPct: number
  passCount: number
  gradeCounts: Record<string, number>
  indPassRates: { key: string; label: string; pass: number; total: number; pct: number | null }[]
  provinceData: { province: string; total: number; pass: number; pct: number; avgTps: number }[]
  periodLabel: string
  zoneLabel: string
  indLoading: boolean
}) {
  if (totalHosp === 0) return null

  const status = passPct >= 60 ? 'ok' : passPct >= 50 ? 'warning' : 'critical'
  const sc = {
    ok:       { bg: '#f0fdf4', border: '#22c55e', titleColor: '#15803d', icon: '🟢', label: 'ภาพรวมดี' },
    warning:  { bg: '#fffbeb', border: '#f59e0b', titleColor: '#92400e', icon: '🟡', label: 'ควรติดตาม' },
    critical: { bg: '#fff1f2', border: '#ef4444', titleColor: '#b91c1c', icon: '🔴', label: 'ต้องเฝ้าระวัง' },
  }[status]

  const fCount = gradeCounts['F'] ?? 0
  const fPct   = totalHosp > 0 ? (fCount / totalHosp * 100) : 0
  const aCount = gradeCounts['A'] ?? 0

  // 3 ตัวชี้วัดที่ผ่านน้อยสุด
  const worstInds = indLoading ? [] :
    [...indPassRates]
      .filter(r => r.pct != null)
      .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))
      .slice(0, 3)

  // ชื่อย่อของตัวชี้วัด
  const shortLabel = (label: string) => label.split(/[≤≥±(]/)[0].trim()

  const topProv   = provinceData[0]
  const worstProv = provinceData[provinceData.length - 1]

  return (
    <div style={{ background: sc.bg, border: `1.5px solid ${sc.border}`, borderRadius: '12px', padding: '16px 20px' }}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-base">{sc.icon}</span>
        <span className="font-bold text-sm" style={{ color: sc.titleColor }}>สรุปภาพรวม — {sc.label}</span>
        <span className="text-xs text-slate-400">{totalHosp.toLocaleString()} รพ. · {periodLabel} · {zoneLabel}</span>
      </div>

      {/* Insight lines */}
      <div className="space-y-1.5">

        {/* A+B pass rate */}
        <div className="text-sm leading-relaxed" style={{ color: passPct >= 60 ? '#15803d' : passPct >= 50 ? '#92400e' : '#b91c1c' }}>
          📊 อัตราผ่านเกณฑ์ (A+B){' '}
          <strong>{passPct.toFixed(1)}%</strong> ({passCount.toLocaleString()} แห่ง)
          {passPct < 60 && <span className="text-slate-400"> — ต่ำกว่าเป้า 60%</span>}
          {aCount > 0 && <span style={{ color: '#15803d' }}> · เกรด A <strong>{aCount} แห่ง</strong></span>}
        </div>

        {/* Grade F */}
        {fCount > 0 && (
          <div className="text-sm leading-relaxed" style={{ color: '#b91c1c' }}>
            ⚠️ เกรด F มี <strong>{fCount} แห่ง ({fPct.toFixed(1)}%)</strong> — ต้องให้ความสนใจเป็นพิเศษ
          </div>
        )}

        {/* Worst indicators */}
        {!indLoading && worstInds.length > 0 && (
          <div className="text-sm leading-relaxed" style={{ color: '#b45309' }}>
            📉 ตัวชี้วัดที่ผ่านน้อยที่สุด:{' '}
            {worstInds.map((ind, i) => (
              <span key={ind.key}>
                {i > 0 && ' · '}
                <strong>{shortLabel(ind.label)}</strong> ({ind.pct?.toFixed(0)}%)
              </span>
            ))}
          </div>
        )}

        {/* Province highlights */}
        {provinceData.length > 1 && topProv && worstProv && (
          <div className="text-sm leading-relaxed" style={{ color: '#1d4ed8' }}>
            🗺️ จังหวัดที่ดีที่สุด:{' '}
            <strong>{topProv.province}</strong> ({topProv.pct.toFixed(0)}% A+B)
            {worstProv.province !== topProv.province && (
              <span style={{ color: '#b91c1c' }}>
                {' '}· ต่ำสุด: <strong>{worstProv.province}</strong> ({worstProv.pct.toFixed(0)}%)
              </span>
            )}
          </div>
        )}

        {/* Loading indicators state */}
        {indLoading && (
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            กำลังโหลดข้อมูลตัวชี้วัด...
          </div>
        )}

      </div>
    </div>
  )
}

function SummaryCard({
  icon, label, value, sub, color,
}: {
  icon: string; label: string; value: string; sub: string
  color: 'navy' | 'gold' | 'blue' | 'amber'
}) {
  const styles: Record<string, React.CSSProperties> = {
    navy:  { background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', borderColor: '#334155' },
    gold:  { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', borderColor: '#f59e0b' },
    blue:  { background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff', borderColor: '#3b82f6' },
    amber: { background: 'linear-gradient(135deg, #92400e, #b45309)', color: '#fff', borderColor: '#d97706' },
  }
  return (
    <div className="rounded-2xl border p-5 shadow-md" style={styles[color]}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold mb-0.5">{value}</div>
      <div className="text-xs opacity-75">{sub}</div>
      <div className="text-xs font-medium mt-2 opacity-85">{label}</div>
    </div>
  )
}
