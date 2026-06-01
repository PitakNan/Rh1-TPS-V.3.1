'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getHospitals, getPeriods, getTpsScores } from '@/lib/fetchData'
import type { Hospital, Period, TpsScore } from '@/lib/types'

export default function ComparePage() {
  const router = useRouter()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getHospitals(), getPeriods(), getTpsScores()])
      .then(([h, p]) => {
        setHospitals(h)
        setPeriods(p)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error:', err)
        setLoading(false)
      })
  }, [])

  const filtered = hospitals.filter(h =>
    !search || h.hospital_name?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (code: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(code)) {
      newSelected.delete(code)
    } else if (newSelected.size < 3) {
      newSelected.add(code)
    }
    setSelected(newSelected)
  }

  const handleCompare = () => {
    if (selected.size > 0) {
      router.push(`/compare/${Array.from(selected).join(',')}`)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">🔍 Compare</h1>
          <div className="flex gap-2">
            <Link href="/" className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded">📊 Dashboard</Link>
            <Link href="/ranking" className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded">🏆 Ranking</Link>
            <Link href="/compare" className="px-4 py-2 bg-blue-600 text-white rounded">🔍 Compare</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Selection Panel */}
          <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">เลือกโรงพยาบาลเพื่อเปรียบเทียบ (สูงสุด 3)</h2>

            <input
              type="text"
              placeholder="ค้นหา..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded mb-4 focus:ring-2 focus:ring-blue-500"
            />

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filtered.map(h => (
                <label
                  key={h.hospital_code}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(h.hospital_code)}
                    onChange={() => handleSelect(h.hospital_code)}
                    disabled={selected.size >= 3 && !selected.has(h.hospital_code)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium text-slate-900">{h.hospital_name}</div>
                    <div className="text-sm text-slate-500">{h.hospital_code} • เขต {h.zone}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Selected Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">เลือกแล้ว ({selected.size})</h2>

            <div className="space-y-2 mb-6">
              {Array.from(selected).map(code => {
                const h = hospitals.find(x => x.hospital_code === code)
                return (
                  <div
                    key={code}
                    className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200"
                  >
                    <div className="text-sm font-medium text-slate-900">{h?.hospital_name}</div>
                    <button
                      onClick={() => handleSelect(code)}
                      className="text-red-500 hover:text-red-700 text-xl"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>

            <button
              onClick={handleCompare}
              disabled={selected.size === 0}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              เปรียบเทียบ →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
