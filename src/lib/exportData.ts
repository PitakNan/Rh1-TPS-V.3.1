export function exportToCSV(
  filename: string,
  data: any[],
  columns?: string[]
) {
  if (data.length === 0) {
    alert('ไม่มีข้อมูลในการส่งออก')
    return
  }

  // Get column names from first row if not provided
  const cols = columns || Object.keys(data[0])

  // Create CSV header
  const header = cols.map(col => `"${col}"`).join(',')

  // Create CSV rows
  const rows = data.map(row =>
    cols
      .map(col => {
        const value = row[col]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return typeof value === 'string' ? `"${value}"` : value
      })
      .join(',')
  )

  // Combine header and rows
  const csv = [header, ...rows].join('\n')

  // Add BOM for UTF-8 in Excel
  const BOM = '﻿'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })

  // Create download link
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToJSON(filename: string, data: any) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })

  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.json`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
