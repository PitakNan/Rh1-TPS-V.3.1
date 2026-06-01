import { NextRequest, NextResponse } from 'next/server'

const INDICATORS = [
  { id: 'ind_1', name: 'ตัวชี้วัด 1' },
  { id: 'ind_2', name: 'ตัวชี้วัด 2' },
  { id: 'ind_3', name: 'ตัวชี้วัด 3' },
  { id: 'ind_4', name: 'ตัวชี้วัด 4' },
  { id: 'ind_5', name: 'ตัวชี้วัด 5' },
  { id: 'ind_6', name: 'ตัวชี้วัด 6' },
]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const zone = searchParams.get('zone')

    const zones = zone ? [Number(zone)] : [1, 2, 3, 4, 5]

    // Mock matrix data
    const matrix: Record<string, Record<string, { passed: number; total: number; pct: number }>> = {}

    INDICATORS.forEach(ind => {
      matrix[ind.id] = {}
      zones.forEach(z => {
        matrix[ind.id][`zone_${z}`] = {
          passed: Math.floor(Math.random() * 20) + 5,
          total: 25,
          pct: Math.floor(Math.random() * 100),
        }
      })
    })

    return NextResponse.json({
      period: '2569Q2',
      zone: zone ? Number(zone) : null,
      indicators: INDICATORS,
      zones,
      matrix,
    })
  } catch (error) {
    console.error('Indicators API error:', error)
    return NextResponse.json({ error: 'Failed to load indicators data' }, { status: 500 })
  }
}
