import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/admin/fix-viewbox — auto-fix viewBox for all icons with wrong values
// Scans SVG coordinates and corrects viewBox when it doesn't match the actual coordinate range
export async function POST() {
  const icons = await db.icon.findMany({ select: { id: true, svg: true, viewBox: true } })
  let fixed = 0
  let skipped = 0

  for (const icon of icons) {
    const vbParts = icon.viewBox.split(/[\s,]+/).map(Number)
    if (vbParts.length !== 4 || isNaN(vbParts[2]) || isNaN(vbParts[3])) {
      skipped++
      continue
    }

    const maxCoord = Math.max(vbParts[2], vbParts[3])

    // Extract all numeric values from SVG path data
    const coordMatches = icon.svg.match(/[\d.]+/g)
    if (!coordMatches || coordMatches.length === 0) {
      skipped++
      continue
    }

    const nums = coordMatches.map(Number).filter(n => !isNaN(n) && n > 1)
    if (nums.length === 0) {
      skipped++
      continue
    }

    const actualMax = Math.max(...nums)

    // If actual coordinates exceed the viewBox by 50%+, fix it
    if (actualMax > maxCoord * 1.5) {
      const scale = Math.ceil(actualMax / 10) * 10 // round up to nearest 10
      const newViewBox = `0 0 ${scale} ${scale}`
      await db.icon.update({ where: { id: icon.id }, data: { viewBox: newViewBox } })
      fixed++
    } else {
      skipped++
    }
  }

  return NextResponse.json({ ok: true, fixed, skipped, total: icons.length })
}
