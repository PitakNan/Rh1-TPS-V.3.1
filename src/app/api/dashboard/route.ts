import { NextRequest, NextResponse } from 'next/server'

// Mock data ชั่วคราว
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const zone = searchParams.get('zone')

    // Mock grade distribution
    const mockData = {
      period: '2569Q2',
      zone: zone ? Number(zone) : null,
      grades: {
        A: 150,
        B: 320,
        C: 280,
        D: 120,
        F: 33,
      },
      total: 903,
      passed: 470,
      passedPct: 52,
    }

    // Adjust if zone selected
    if (zone) {
      mockData.grades = {
        A: 12,
        B: 28,
        C: 15,
        D: 8,
        F: 2,
      }
      mockData.total = 65
      mockData.passed = 40
      mockData.passedPct = 62
    }

    return NextResponse.json(mockData)
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
