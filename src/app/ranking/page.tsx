'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getHospitals, getPeriods, getTpsScores, getRiskProfiles } from '@/lib/fetchData'
import type { Hospital, Period, TpsScore, RiskProfile } from '@/lib/types'

const PAGE_SIZE = 50

export default function RankingPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [allScores, setAllScores] = useState<TpsScore[]>([])
  const [allRisks, setAllRisks] = useState<RiskProfile[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [tab, setTab] = useState<'tps' | 'risk'>('tps')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getHospitals(), getPeriods(), getTpsScores(), getRiskProfiles()])
      .then(([h, p, s, r]) => {
        setHospitals(h)
        setPeriods(p)
        setAllScores(s)
        setAllRisks(r)
        setSelectedPeriod(p?.[p.length - 1]?.period_id ?? '')
        setLoading(false)
      })
      .catch(err => {
        console.error('Error:', err)
        setLoading(false)
      })
  }, [])

  const scores = useMemo(() =>
    allScores.filter(s => s.period_id === selectedPeriod)
      .sort((a, b) => (b.tps_score ?? 0) - (a.tps_score ?? 0)),
    [allScores, selectedPeriod]
  )

  const risks = useMemo(() =>
    allRisks.filter(r => r.period_id === selectedPeriod)
      .sort((a, b) => (a.rp_risk_score ?? 999) - (b.rp_risk_score ?? 999)),
    [allRisks, selectedPeriod]
  )

  const data = tab === 'tps' ? scores : risks
  const paginated = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const total = Math.ceil(data.length / PAGE_SIZE)

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">🏆 จัดลำดับ</h1>
          <div className="flex gap-2">
            <Link href="/" className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded">📊 Dashboard</Link>
            <Link href="/ranking" className="px-4 py-2 bg-blue-600 text-white rounded">🏆 Ranking</Link>
            <Link href="/compare" className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded">🔍 Compare</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">ไตรมาส</label>
              <select
                value={selectedPeriod}
                onChange={e => { setSelectedPeriod(e.target.value); setPage(1) }}
                className="px-4 py-2 border border-slate-300 rounded"
              >
                {periods.map(p => (
                  <option key={p.period_id} value={p.period_id}>
                    Q{p.quarter}/{p.year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 border-b">
            <button
              onClick={() => { setTab('tps'); setPage(1) }}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                tab === 'tps'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 TPS Score
            </button>
            <button
              onClick={() => { setTab('risk'); setPage(1) }}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                tab === 'risk'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚠️ Risk Score
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">อันดับ</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">รหัส</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">ชื่อ</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">คะแนน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginated.map((item, idx) => {
                const rank = (page - 1) * PAGE_SIZE + idx + 1
                const hosp = hospitals.find(h => h.hospital_code === item.hospital_code)
                return (
                  <tr key={item.hospital_code} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-bold text-lg">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </td>
                    <td className="px-6 py-3 text-sm">{item.hospital_code}</td>
                    <td className="px-6 py-3">
                      <Link href={`/hospital/${item.hospital_code}`} className="text-blue-600 hover:underline">
                        {hosp?.hospital_name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-blue-600">
                      {tab === 'tps' ? (item as TpsScore).tps_score?.toFixed(2) : (item as RiskProfile).rp_risk_score?.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Page {page} of {total} ({data.length} รายการ)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-slate-300 rounded disabled:opacity-50"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(5, total) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i
                if (p < 1 || p > total) return null
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 rounded ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(total, p + 1))}
                disabled={page === total}
                className="px-3 py-1 border border-slate-300 rounded disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
