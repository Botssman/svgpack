import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

/**
 * POST /api/admin/upload-icons
 *
 * Accepts a ZIP archive with SVG files (flat or in subfolders).
 * Extracts every .svg file, reads its content, and returns structured
 * icon data (slug, nameRu, nameEn, keywords, svg, viewBox) so the
 * frontend can preview and then save them to a pack.
 *
 * Body: multipart/form-data with field "file" = the ZIP archive
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Only .zip files are supported' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)

    const icons: {
      slug: string
      nameRu: string
      nameEn: string
      keywords: string
      svg: string
      viewBox: string
    }[] = []

    // Collect all .svg files (including nested in folders)
    const svgFiles: { path: string; zipEntry: JSZip.JSZipObject }[] = []
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.svg')) {
        svgFiles.push({ path: relativePath, zipEntry })
      }
    })

    // Sort by path for deterministic order
    svgFiles.sort((a, b) => a.path.localeCompare(b.path))

    for (const { path, zipEntry } of svgFiles) {
      const svgContent = await zipEntry.async('string')

      // Extract viewBox from the <svg> tag, default to "0 0 24 24"
      let viewBox = '0 0 24 24'
      const vbMatch = svgContent.match(/viewBox\s*=\s*"([^"]+)"/)
      if (vbMatch) {
        viewBox = vbMatch[1]
      }

      // Extract inner SVG content (everything inside <svg>...</svg>)
      let innerSvg = svgContent
      const innerMatch = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
      if (innerMatch) {
        innerSvg = innerMatch[1].trim()
      } else {
        // If no <svg> wrapper, use the whole content as inner
        innerSvg = svgContent.trim()
      }

      // Generate slug from filename (without extension and path)
      const fileName = path.split('/').pop() || 'icon'
      const rawName = fileName.replace(/\.svg$/i, '')

      // Convert filename to human-readable name
      // e.g. "arrow-right" → "Arrow Right", "user_profile" → "User Profile"
      const humanName = rawName
        .split(/[-_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')

      // Generate slug: lowercase, dashes
      const slug = rawName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      // Keywords from filename parts
      const keywords = rawName
        .toLowerCase()
        .split(/[-_\s]+/)
        .filter(w => w.length > 1)
        .join(', ')

      icons.push({
        slug,
        nameRu: humanName,
        nameEn: humanName,
        keywords,
        svg: innerSvg,
        viewBox,
      })
    }

    return NextResponse.json({
      ok: true,
      totalFiles: svgFiles.length,
      icons,
    })
  } catch (e: any) {
    console.error('[/api/admin/upload-icons] ERROR:', e?.message || e)
    return NextResponse.json(
      { error: e?.message || 'Failed to process ZIP archive' },
      { status: 500 },
    )
  }
}
