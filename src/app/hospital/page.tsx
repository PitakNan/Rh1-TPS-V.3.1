'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { getHospitals, getPeriods, getIndicators } from '@/lib/fetchData'
import type { Hospital, Period, Indicator } from '@/lib/types'

// ── ตัวชี้วัด 20 ตัว ──────────────────────────────────────────────────────

const IND_COLS: { key: keyof Indicator; short: string; full: string; binaryOnly?: boolean }[] = [
  { key: 'ind_revenue',   short: 'รายได้',    full: 'มิติรายได้' },
  { key: 'ind_expense',   short: 'ค่าใช้จ่าย', full: 'มิติค่าใช้จ่าย', binaryOnly: true },
  { key: 'ind_app_d',     short: 'AP Days',   full: 'ระยะเวลาชำระเจ้าหนี้' },
  { key: 'ind_acp_uc',    short: 'ACP UC',    full: 'ACP สิทธิ UC' },
  { key: 'ind_acp_cs',    short: 'ACP CS',    full: 'ACP สิทธิข้าราชการ' },
  { key: 'ind_aip',       short: 'Inven.',    full: 'การบริหารสินค้าคงคลัง' },
  { key: 'ind_qm_op',     short: 'Unit OP',   full: 'Unit Cost OP' },
  { key: 'ind_qm_ip',     short: 'Unit IP',   full: 'Unit Cost IP' },
  { key: 'ind_lc',        short: 'LC',        full: 'LC ค่าแรงบุคลากร' },
  { key: 'ind_drug',      short: 'MC ยา',     full: 'MC ค่ายา' },
  { key: 'ind_sci_mat',   short: 'MC วัสดุ',  full: 'MC วัสดุวิทยาศาสตร์' },
  { key: 'ind_non_drug',  short: 'MC เวช',    full: 'MC ค่าเวชภัณฑ์' },
  { key: 'ind_trial_bal', short: 'งบทดลอง',  full: 'คะแนนตรวจสอบงบทดลอง' },
  { key: 'ind_bed_occ',   short: 'ครองเตียง', full: 'อัตราครองเตียง ≥ 80%' },
  { key: 'ind_sum_adjrw', short: 'AdjRW',    full: 'SumAdjRW' },
  { key: 'ind_opm',       short: 'OPM',       full: 'Operating Margin' },
  { key: 'ind_roa',       short: 'ROA',       full: 'Return on Asset' },
  { key: 'ind_ebitda',    short: 'EBITDA',    full: 'EBITDA ≥ 0' },
  { key: 'ind_nwc',       short: 'NWC',       full: 'Net Working Capital ≥ 0' },
  { key: 'ind_cash',      short: 'Cash',      full: 'Cash Ratio ≥ 0.8' },
]

// ── Component ─────────────────────────────────────────────────────────────

export default function HospitalPage() {
  const [hospitals, setHospitals]   = useState<Hospital[]>([])
  const [periods, setPeriods]       = useState<Period[]>([])
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [loading, setLoading]       = useState(true)
  const [indLoading, setIndLoading] = useState(true)

  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedZone, setSelectedZone]     = useState('all')
  const [selectedProv, setSelectedProv]     = useState('all')

  // ── Load ──
  useEffect(() => {
    Promise.all([getHospitals(), getPeriods()]).then(([h, p]) => {
      setHospitals(h)
      setPeriods(p)
      const latest = [...p].sort((a, b) => b.period_id.localeCompare(a.period_id))[0]
      if (latest) setSelectedPeriod(latest.period_id)
      setLoading(false)
    })
    getIndicators().then(d => { setIndicators(d); setIndLoading(false) })
  }, [])

  // ── Lookup: hospital_code → Indicator (for selected period) ──
  const indMap = useMemo(() => {
    const m = new Map<string, Indicator>()
    indicators
      .filter(i => i.period_id === selectedPeriod)
      .forEach(i => m.set(i.hospital_code, i))
    return m
  }, [indicators, selectedPeriod])

  // ── จังหวัดที่มีในเขตที่เลือก ──
  const availableProvs = useMemo(() => {
    const s = new Set<string>()
    hospitals.forEach(h => {
      if (selectedZone !== 'all' && parseInt(String(h.zone)) !== parseInt(selectedZone)) return
      if (h.province) s.add(h.province)
    })
    return [...s].sort((a, b) => a.localeCompare(b, 'th'))
  }, [hospitals, selectedZone])

  // reset province เมื่อเขตเปลี่ยน
  useEffect(() => { setSelectedProv('all') }, [selectedZone])

  // ── กรองและเรียง รพ. ──
  const filteredHospitals = useMemo(() => {
    return hospitals
      .filter(h => {
        if (selectedZone !== 'all' && parseInt(String(h.zone)) !== parseInt(selectedZone)) return false
        if (selectedProv !== 'all' && h.province !== selectedProv) return false
        return true
      })
      .sort((a, b) => {
        const zprov = a.province.localeCompare(b.province, 'th')
        if (zprov !== 0) return zprov
        return a.hospital_name.localeCompare(b.hospital_name, 'th')
      })
  }, [hospitals, selectedZone, selectedProv])

  // ── สรุปยอดผ่านแต่ละตัวชี้วัด ──
  const colPassCount = useMemo(() => {
    return IND_COLS.map(col => {
      let pass = 0, total = 0
      filteredHospitals.forEach(h => {
        const ind = indMap.get(h.hospital_code)
        if (!ind) return
        const v = ind[col.key] as number | null
        if (col.binaryOnly && v != null && v !== 0 && v !== 1) return
        if (v == null) return
        total++
        if (v > 0) pass++
      })
      return { pass, total }
    })
  }, [filteredHospitals, indMap])

  // ── Cell renderer ──
  const renderCell = (ind: Indicator | undefined, col: typeof IND_COLS[0]) => {
    if (!ind) return (
      <td key={col.key} className="px-1 py-1.5 text-center border-r border-slate-100">
        <span className="block w-6 h-6 rounded mx-auto bg-slate-100" title="ไม่มีข้อมูล" />
      </td>
    )
    const v = ind[col.key] as number | null
    if (col.binaryOnly && v != null && v !== 0 && v !== 1) {
      return (
        <td key={col.key} className="px-1 py-1.5 text-center border-r border-slate-100">
          <span className="block w-6 h-6 rounded mx-auto bg-slate-100" title="ไม่มีข้อมูล" />
        </td>
      )
    }
    if (v == null) return (
      <td key={col.key} className="px-1 py-1.5 text-center border-r border-slate-100">
        <span className="block w-6 h-6 rounded mx-auto bg-slate-100" title="ไม่มีข้อมูล" />
      </td>
    )
    const pass = v > 0
    return (
      <td key={col.key} className="px-1 py-1.5 text-center border-r border-slate-100">
        <span
          className={`block w-6 h-6 rounded mx-auto flex items-center justify-center text-xs font-bold ${
            pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}
          title={`${col.full}: ${v}`}
        >
          {pass ? '✓' : '✗'}
        </span>
      </td>
    )
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  )

  // จัดกลุ่มตามจังหวัด
  const grouped: { province: string; hospList: Hospital[] }[] = []
  filteredHospitals.forEach(h => {
    const last = grouped[grouped.length - 1]
    if (!last || last.province !== h.province) grouped.push({ province: h.province, hospList: [h] })
    else last.hospList.push(h)
  })

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 shadow-xl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <div className="max-w-screen-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>📋</div>
            <div>
              <h1 className="text-xl font-bold leading-tight text-white">TPS Dashboard</h1>
              <p className="text-xs" style={{ color: '#f59e0b' }}>Scorecard ผ่าน/ไม่ผ่าน รายโรงพยาบาล</p>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <a href="/" className="px-3 py-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition">ภาพรวม</a>
            <a href="/trend" className="px-3 py-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition">Trend</a>
            <span className="px-3 py-1.5 rounded-md font-semibold text-white" style={{ background: 'rgba(245,158,11,0.25)', border: '1px solid rgba(245,158,11,0.4)' }}>รายโรงพยาบาล</span>
          </nav>
        </div>
      </header>

      {/* ── Filter bar (sticky) ── */}
      <div className="sticky z-40 bg-white border-b shadow-sm" style={{ top: '72px', borderColor: '#e2e8f0' }}>
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex flex-wrap gap-3 items-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">กรองข้อมูล</span>

          {/* Period */}
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
            {[...periods].reverse().map(p => (
              <option key={p.period_id} value={p.period_id}>ไตรมาส {p.quarter}/{p.year}</option>
            ))}
          </select>

          {/* Zone */}
          <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
            <option value="all">ทุกเขตสุขภาพ</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(z => (
              <option key={z} value={String(z)}>เขต {z}</option>
            ))}
          </select>

          {/* Province */}
          <select value={selectedProv} onChange={e => setSelectedProv(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
            <option value="all">ทุกจังหวัด</option>
            {availableProvs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {(selectedZone !== 'all' || selectedProv !== 'all') && (
            <button onClick={() => { setSelectedZone('all'); setSelectedProv('all') }}
              className="text-xs text-blue-600 hover:text-blue-800 underline">ล้างตัวกรอง</button>
          )}

          {/* Legend */}
          <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">✓</span>ผ่าน (รวม 0.5)</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">✗</span>ไม่ผ่าน</span>
            <span className="text-slate-400">· แสดง {filteredHospitals.length} โรงพยาบาล</span>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="max-w-screen-2xl mx-auto px-4 py-5">
        {indLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">กำลังโหลดข้อมูลตัวชี้วัด (14 MB)...</p>
          </div>
        ) : selectedZone === 'all' && selectedProv === 'all' ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
            <div className="text-5xl">🔍</div>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-600 mb-1">กรุณาเลือกตัวกรองก่อน</p>
              <p className="text-sm">เลือก <strong>เขตสุขภาพ</strong> หรือ <strong>จังหวัด</strong> เพื่อแสดงตาราง</p>
              <p className="text-xs mt-1 text-slate-300">การแสดง 903 โรงพยาบาลพร้อมกันอาจทำให้หน้าหน่วง</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-150px)]">
              <table className="w-full border-collapse text-sm" style={{ minWidth: '1100px' }}>

                {/* ── Column headers (sticky top 2 แถว) ── */}
                <thead>
                  {/* แถว 1: ชื่อตัวชี้วัด — sticky top-0 */}
                  <tr className="border-b-2 border-slate-200">
                    {/* Fixed columns (sticky ทั้ง top + left = z-30) */}
                    <th className="sticky left-0 top-0 z-30 h-12 text-left px-3 text-xs font-semibold text-slate-300 w-8 border-r border-slate-700"
                      style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>#</th>
                    <th className="sticky left-8 top-0 z-30 h-12 text-left px-3 text-xs font-semibold text-white min-w-[220px] border-r border-slate-700"
                      style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>ชื่อโรงพยาบาล</th>
                    <th className="sticky top-0 z-20 h-12 text-left px-3 text-xs font-semibold text-slate-300 w-10 border-r border-slate-600"
                      style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>ประเภท</th>

                    {/* Indicator columns */}
                    {IND_COLS.map((col, ci) => (
                      <th key={col.key} className="sticky top-0 z-20 h-12 px-1 text-center border-r border-slate-700 w-14"
                        style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
                        <div className="text-xs font-semibold text-slate-200 leading-tight">{col.short}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{ci + 1}</div>
                      </th>
                    ))}

                    {/* Pass count */}
                    <th className="sticky top-0 z-20 h-12 px-3 text-center text-xs font-semibold text-slate-300 w-16 border-l border-slate-600"
                      style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>ผ่าน</th>
                  </tr>

                  {/* แถว 2: อัตราผ่าน — sticky top-12 (ใต้แถว 1) */}
                  <tr className="border-b border-slate-200">
                    <td className="sticky left-0 top-12 z-30 px-3 py-1.5 bg-slate-50 border-r border-slate-200" />
                    <td className="sticky left-8 top-12 z-30 px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border-r border-slate-200">
                      อัตราผ่าน ({filteredHospitals.length} รพ.)
                    </td>
                    <td className="sticky top-12 z-20 px-3 py-1.5 bg-slate-50 border-r border-slate-200" />
                    {IND_COLS.map((col, ci) => {
                      const { pass, total } = colPassCount[ci]
                      const pct = total > 0 ? Math.round(pass / total * 100) : null
                      const color = pct == null ? 'text-slate-300' : pct >= 60 ? 'text-green-700' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'
                      return (
                        <td key={col.key} className="sticky top-12 z-20 px-1 py-1.5 text-center bg-slate-50 border-r border-slate-200">
                          <div className="text-xs font-semibold text-slate-700">
                            {total > 0 ? `${pass}/${total}` : '–'}
                          </div>
                          <div className={`text-xs leading-tight ${color}`}>
                            {pct != null ? `${pct}%` : ''}
                          </div>
                        </td>
                      )
                    })}
                    <td className="sticky top-12 z-20 px-3 py-1.5 bg-slate-50 border-l border-slate-200" />
                  </tr>
                </thead>

                <tbody>
                  {grouped.map(({ province, hospList }) => (
                    <Fragment key={province}>
                      {/* Province separator */}
                      <tr key={`prov-${province}`} className="border-t-2 border-blue-200">
                        <td colSpan={3 + IND_COLS.length + 1}
                          className="sticky left-0 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border-b border-blue-100">
                          📍 {province}
                          <span className="ml-2 font-normal text-blue-500">({hospList.length} โรงพยาบาล)</span>
                        </td>
                      </tr>

                      {/* Hospital rows */}
                      {hospList.map((h, rowIdx) => {
                        const ind = indMap.get(h.hospital_code)
                        const passCount = ind ? IND_COLS.filter(col => {
                          const v = ind[col.key] as number | null
                          if (col.binaryOnly && v != null && v !== 0 && v !== 1) return false
                          return v != null && v > 0
                        }).length : null
                        const totalCount = ind ? IND_COLS.filter(col => {
                          const v = ind[col.key] as number | null
                          if (col.binaryOnly && v != null && v !== 0 && v !== 1) return false
                          return v != null
                        }).length : 0

                        return (
                          <tr key={h.hospital_code}
                            className={`border-b border-slate-100 transition hover:bg-amber-50 ${rowIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>

                            {/* # */}
                            <td className={`sticky left-0 z-10 px-3 py-1.5 text-xs text-slate-400 border-r border-slate-200 ${rowIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}>
                              {rowIdx + 1}
                            </td>

                            {/* Hospital name */}
                            <td className={`sticky left-8 z-10 px-3 py-2 border-r border-slate-200 ${rowIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}>
                              <div className="font-medium text-slate-800 text-xs leading-tight">{h.hospital_name}</div>
                              <div className="text-slate-400 text-xs">{h.hospital_code}</div>
                            </td>

                            {/* ประเภท */}
                            <td className="px-2 py-1.5 text-center border-r border-slate-100">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{h.type}</span>
                            </td>

                            {/* Indicator cells */}
                            {IND_COLS.map(col => renderCell(ind, col))}

                            {/* Pass count */}
                            <td className="px-3 py-1.5 text-center border-l border-slate-200">
                              {passCount != null ? (
                                <span className={`text-xs font-bold ${
                                  passCount / totalCount >= 0.6 ? 'text-green-700' :
                                  passCount / totalCount >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                                }`}>{passCount}<span className="font-normal text-slate-400">/{totalCount}</span></span>
                              ) : (
                                <span className="text-xs text-slate-300">–</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <footer className="text-center py-6 text-xs border-t mt-4" style={{ background: '#0f172a', color: '#64748b', borderColor: '#1e293b' }}>
        <span style={{ color: '#f59e0b' }}>TPS Dashboard</span>
        <span className="mx-2">|</span>
        ข้อมูล 903 โรงพยาบาล 23 ไตรมาส (2563Q4–2569Q2)
      </footer>
    </div>
  )
}
