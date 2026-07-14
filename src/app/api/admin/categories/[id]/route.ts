import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * PATCH /api/admin/categories/[id]
 * Update a category.
 * Body: { slug?, nameRu?, nameEn?, descRu?, descEn?, sortOrder? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { slug, nameRu, nameEn, descRu, descEn, sortOrder } = body

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 })
    }

    // If slug is changing, check uniqueness
    if (slug && slug !== existing.slug) {
      const slugConflict = await db.category.findUnique({ where: { slug } })
      if (slugConflict) {
        return NextResponse.json({ error: `Slug "${slug}" уже занят` }, { status: 409 })
      }
    }

    const category = await db.category.update({
      where: { id },
      data: {
        ...(slug !== undefined && { slug }),
        ...(nameRu !== undefined && { nameRu }),
        ...(nameEn !== undefined && { nameEn }),
        ...(descRu !== undefined && { descRu }),
        ...(descEn !== undefined && { descEn }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json({ ok: true, category })
  } catch (e: any) {
    console.error('[/api/admin/categories PATCH] ERROR:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/categories/[id]
 * Delete a category.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 })
    }

    // Check if any packs use this category
    const packsCount = await db.pack.count({ where: { category: existing.slug } })
    if (packsCount > 0) {
      return NextResponse.json({
        error: `Нельзя удалить: категория "${existing.nameRu}" используется в ${packsCount} паке(ах). Сначала смените категорию у этих паков.`,
      }, { status: 409 })
    }

    await db.category.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[/api/admin/categories DELETE] ERROR:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 })
  }
}
