'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getHospitals, getPeriods, getTpsScores } from '@/lib/fetchData'
import type { Hospital, Period, TpsScore } from '@/lib/types'

type ScoreField = { key: keyof TpsScore; label: string; max: number }

const SCORE_FIELDS: ScoreField[] = [
  { key: 'score_1_1', label: '1.1 Financial Performance', max: 4 },
  { key: 'score_1_2', label: '1.2 Efficiency', max: 4 },
  { key: 'score_1_3', label: '1.3 Accounting Quality', max: 4 },
  { key: 'score_2_1', label: '2.1 Unit Cost', max: 4 },
  { key: 'score_2_2', label: '2.2 Expense Ratio', max: 4 },
  { key: 'score_process', label: 'Process', max: 12 },
  { key: 'score_outcome', label: 'Outcome', max: 8 },
]

function getColor(pct: number) {
  if (pct >= 75) return { bg: 'bg-emerald-100', text: 'text-emerald-900' }
  if (pct >= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-900' }
  return { bg: 'bg-red-100', text: 'text-red-900' }
}

export default function MatrixPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [allScores, setAllScores] = useState<TpsScore[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getHospitals(), getPeriods(), getTpsScores()])
      .then(([h, p, s]) => {
        setHospitals(h)
        setPeriods(p)
        setAllScores(s)
        setSelectedPeriod(p[p.length - 1]?.period_id ?? '')
        setLoading(false)
      })
      .catch(err => { console.error(err); setLoading(false) })
  }, [])

  const hospZone = useMemo(() => {
    const map: Record<string, number> = {}
    for (const h of hospitals) {
      if (h.zone != null) map[h.hospital_code] = Number(h.zone)
    }
    return map
  }, [hospitals])

  const zones = useMemo(() => {
    const s = new Set<number>()
    for (const v of Object.values(hospZone)) s.add(v)
    return Array.from(s).sort((a, b) => a - b)
  }, [hospZone])

  const matrix = useMemo(() => {
    const periodScores = allScores.filter(s => s.period_id === selectedPeriod)
    const result: Record<number, Record<string, { sum: number; count: number }>> = {}
    for (const z of zones) result[z] = {}
    for (const s of periodScores) {
      const z = hospZone[s.hospital_code]
      if (z == null || !result[z]) continue
      for (const f of SCORE_FIELDS) {
        const val = s[f.key] as number | null
        if (val == null) continue
        if (!result[z][f.key]) result[z][f.key] = { sum: 0, count: 0 }
        result[z][f.key].sum += val
        result[z][f.key].count += 1
      }
    }
    return result
  }, [allScores, selectedPeriod, hospZone, zones])

  const currentPeriod = periods.find(p => p.period_id === selectedPeriod)
  const periodLabel = currentPeriod ? `Q${currentPeriod.quarter}/${currentPeriod.year}` : ''

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold">Indicators Matrix</h1>
            <Link href="/" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition">Home</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8">
          <label className="block text-sm font-semibold text-slate-900 mb-2">Period</label>
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="w-full sm:w-64 px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none transition text-sm">
            {periods.map(p => (
              <option key={p.period_id} value={p.period_id}>Q{p.quarter}/{p.year}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                  <th className="px-4 sm:px-6 py-4 text-left font-bold text-xs sm:text-sm whitespace-nowrap">Indicator</th>
                  {zones.map(z => (
                    <th key={z} className="px-3 sm:px-4 py-4 text-center font-bold text-xs sm:text-sm whitespace-nowrap">Zone {z}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {SCORE_FIELDS.map(f => (
                  <tr key={f.key} className="hover:bg-slate-50 transition">
                    <td className="px-4 sm:px-6 py-4 font-medium text-slate-900 text-xs sm:text-sm whitespace-nowrap">{f.label}</td>
                    {zones.map(z => {
                      const cell = matrix[z]?.[f.key]
                      if (!cell || cell.count === 0) {
                        return (<td key={z} className="px-3 sm:px-4 py-4 text-center"><div className="bg-slate-100 text-slate-400 rounded-lg py-2 px-2 text-xs">N/A</div></td>)
                      }
                      const avg = cell.sum / cell.count
                      const pct = (avg / f.max) * 100
                      const colors = getColor(pct)
                      return (
                        <td key={z} className="px-3 sm:px-4 py-4 text-center">
                          <div className={`${colors.bg} ${colors.text} rounded-lg py-2 px-2`}>
                            <div className="font-bold text-xs sm:text-sm">{avg.toFixed(2)}</div>
                            <div className="text-xs opacity-75">{pct.toFixed(0)}%</div>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="px-4 sm:px-6 py-4 text-slate-900 text-xs sm:text-sm">TPS Total (0-20)</td>
                  {zones.map(z => {
                    const ps = allScores.filter(s => s.period_id === selectedPeriod && hospZone[s.hospital_code] === z && s.tps_score != null)
                    if (ps.length === 0) {
                      return <td key={z} className="px-3 sm:px-4 py-4 text-center text-xs text-slate-400">N/A</td>
                    }
                    const avg = ps.reduce((sum, s) => sum + (s.tps_score ?? 0), 0) / ps.length
                    const pct = (avg / 20) * 100
                    const colors = getColor(pct)
                    return (
                      <td key={z} className="px-3 sm:px-4 py-4 text-center">
                        <div className={`${colors.bg} ${colors.text} rounded-lg py-2 px-2`}>
                          <div className="font-bold text-sm">{avg.toFixed(2)}</div>
                          <div className="text-xs opacity-75">{ps.length} hospitals</div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-500">
            <h4 className="font-bold text-slate-900 mb-2 text-sm">Good (75-100%)</h4>
            <p className="text-slate-600 text-xs">Average score is at a good level</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <h4 className="font-bold text-slate-900 mb-2 text-sm">Average (50-74%)</h4>
            <p className="text-slate-600 text-xs">Needs monitoring and improvement</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
            <h4 className="font-bold text-slate-900 mb-2 text-sm">Needs Improvement (&lt;50%)</h4>
            <p className="text-slate-600 text-xs">Urgent improvement required</p>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mt-8">
          <h4 className="font-bold text-blue-900 mb-2 text-sm">How to read</h4>
          <p className="text-blue-800 text-xs sm:text-sm">Each cell shows the average score per zone and percentage vs max. Background color indicates performance level. | {periodLabel}</p>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 sm:py-8 px-4 mt-12 bg-white">
        <div className="max-w-7xl mx-auto text-center text-slate-600 text-xs sm:text-sm">
          <p>Data: {periodLabel}</p>
        </div>
      </footer>
    </div>
  )
}
