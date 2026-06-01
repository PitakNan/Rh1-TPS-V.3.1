'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getHospitals, getPeriods, getTpsScores, calcGradeDist } from '@/lib/fetchData'
import type { Hospital, Period, TpsScore } from '@/lib/types'

export default function GradesPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [allScores, setAllScores] = useState<TpsScore[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [showDetails, setShowDetails] = useState<string | null>(null)
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

  const filteredScores = useMemo(() => {
    return allScores.filter(s => {
      if (s.period_id !== selectedPeriod) return false
      if (selectedZone !== 'all' && hospZone[s.hospital_code] !== Number(selectedZone)) return false
      return true
    })
  }, [allScores, selectedPeriod, selectedZone, hospZone])

  const gradeDist = useMemo(() => calcGradeDist(filteredScores), [filteredScores])

  const total = filteredScores.length
  const passed = gradeDist.filter(g => g.grade === 'A' || g.grade === 'B').reduce((sum, g) => sum + g.count, 0)
  const passedPct = total > 0 ? Math.round((passed / total) * 100) : 0

  const gradeInfo: Record<string, { color: string; title: string; desc: string }> = {
    A: { color: 'from-emerald-500 to-green-600', title: 'Excellent', desc: 'Passed all criteria with top TPS scores' },
    B: { color: 'from-blue-500 to-cyan-600', title: 'Good', desc: 'Passed most criteria with minor areas to improve' },
    C: { color: 'from-yellow-500 to-amber-600', title: 'Average', desc: 'Multiple areas need development' },
    D: { color: 'from-orange-500 to-red-600', title: 'Needs Improvement', desc: 'Urgent development needed in many indicators' },
    F: { color: 'from-red-500 to-rose-600', title: 'Critical', desc: 'Immediate action required, performance far below standards' },
  }

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
            <h1 className="text-2xl sm:text-3xl font-bold">Grade Distribution</h1>
            <Link href="/" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition">Home</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Period</label>
              <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="w-full sm:w-56 px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none transition text-sm">
                {periods.map(p => (
                  <option key={p.period_id} value={p.period_id}>Q{p.quarter}/{p.year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Zone</label>
              <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} className="w-full sm:w-56 px-4 py-3 border-2 border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:outline-none transition text-sm">
                <option value="all">All Zones</option>
                {zones.map(z => (
                  <option key={z} value={z}>Zone {z}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl shadow-lg p-8 sm:p-12 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Passed (Grade A + B)</h2>
          <div className="text-4xl sm:text-6xl font-bold mb-4">{passed.toLocaleString()}</div>
          <p className="text-lg sm:text-xl opacity-90">{passedPct}% of {total.toLocaleString()} hospitals | {periodLabel}</p>
          <div className="mt-6 w-full bg-white/20 rounded-full h-3">
            <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${passedPct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-12">
          {gradeDist.map(({ grade, count, pct }) => {
            const info = gradeInfo[grade]
            if (!info) return null
            return (
              <button key={grade} onClick={() => setShowDetails(showDetails === grade ? null : grade)} className="group bg-white rounded-xl shadow-md hover:shadow-xl transition duration-300 overflow-hidden border-2 border-slate-100 hover:border-blue-300 text-left">
                <div className={`bg-gradient-to-br ${info.color} text-white p-6 sm:p-8`}>
                  <div className="text-3xl sm:text-4xl font-bold mb-2">Grade {grade}</div>
                  <p className="text-sm opacity-90">{info.title}</p>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{count}</div>
                  <div className="text-xs sm:text-sm text-slate-600 mb-4">{pct}%</div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className={`bg-gradient-to-r ${info.color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {showDetails === grade && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-slate-200">
                    <p className="text-xs sm:text-sm text-slate-600">{info.desc}</p>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 border-l-4 border-emerald-500">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">Passed</h3>
            <div className="space-y-3 text-sm text-slate-700">
              {gradeDist.filter(g => g.grade === 'A' || g.grade === 'B').map(g => (
                <p key={g.grade}>Grade {g.grade} ({gradeInfo[g.grade]?.title}): <span className="font-bold text-emerald-600">{g.count}</span></p>
              ))}
              <p className="text-base font-bold text-emerald-600 border-t pt-3">Total: {passed} ({passedPct}%)</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 border-l-4 border-red-500">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">Needs Development</h3>
            <div className="space-y-3 text-sm text-slate-700">
              {gradeDist.filter(g => g.grade !== 'A' && g.grade !== 'B').map(g => (
                <p key={g.grade}>Grade {g.grade} ({gradeInfo[g.grade]?.title}): <span className="font-bold text-orange-600">{g.count}</span></p>
              ))}
              <p className="text-base font-bold text-red-600 border-t pt-3">Total: {total - passed} ({total > 0 ? 100 - passedPct : 0}%)</p>
            </div>
          </div>
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
