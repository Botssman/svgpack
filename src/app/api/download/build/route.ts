import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renderSvg, makeZip, CustomConfig } from '@/lib/svg'

const FREE_BUILDS_PER_MONTH = 3

// POST /api/download/build
// body: { name: string, items: [{ iconId, cfg? }] }
// Лимит: 3 бесплатных скачивания в месяц для пользователей без подписки.
// Подписчики — безлимит.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, items } = body as {
    name: string
    items: { iconId: string; cfg?: CustomConfig }[]
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400 })
  }

  // Проверяем авторизацию и лимит скачиваний
  const email = req.headers.get('x-user-email')
  let user = email ? await db.user.findUnique({
    where: { email },
    include: { subscriptions: true },
  }) : null

  const hasActiveSub = !!user?.subscriptions?.some(
    s => s.status === 'active' && new Date(s.expiresAt) > new Date()
  )

  if (!hasActiveSub) {
    // Проверяем/сбрасываем счётчик бесплатных скачиваний
    if (user) {
      const now = new Date()
      const resetAt = user.freeBuildsResetAt

      // Если сброс был в прошлом месяце или никогда — обнуляем
      if (!resetAt || isDifferentMonth(now, new Date(resetAt))) {
        await db.user.update({
          where: { id: user.id },
          data: { freeBuildsUsed: 0, freeBuildsResetAt: now },
        })
        user = { ...user, freeBuildsUsed: 0, freeBuildsResetAt: now }
      }

      // Проверяем лимит
      if (user.freeBuildsUsed >= FREE_BUILDS_PER_MONTH) {
        return NextResponse.json({
          error: 'free_builds_limit',
          message: `Лимит бесплатных скачиваний: ${FREE_BUILDS_PER_MONTH} в месяц. Оформите подписку для безлимита.`,
          limit: FREE_BUILDS_PER_MONTH,
          used: user.freeBuildsUsed,
        }, { status: 403 })
      }

      // Увеличиваем счётчик
      await db.user.update({
        where: { id: user.id },
        data: { freeBuildsUsed: user.freeBuildsUsed + 1 },
      })
    }
    // Если пользователь не авторизован — разрешаем скачать без лимита
    // (для обратной совместимости, но лучше требовать логин)
  }

  // Генерируем ZIP
  const ids = items.map((i) => i.iconId)
  const icons = await db.icon.findMany({ where: { id: { in: ids } }, include: { pack: true } })

  const files = items.map((it) => {
    const ic = icons.find((i) => i.id === it.iconId)
    if (!ic) return null
    const svg = it.cfg
      ? renderSvg(ic.svg, ic.viewBox, it.cfg)
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="${ic.viewBox}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ic.svg}</svg>`
    return { name: `${name || 'my-pack'}/${ic.slug}.svg`, content: svg }
  }).filter(Boolean) as { name: string; content: string }[]

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${icons.filter((ic) => ic?.slug).map((ic) => `<symbol id="${ic.slug}" viewBox="${ic.viewBox}">${ic.svg}</symbol>`).join('')}</svg>`
  files.push({ name: `${name || 'my-pack'}/sprite.svg`, content: sprite })

  const zipBase64 = makeZip(files)
  const zipBuffer = Buffer.from(zipBase64, 'base64')
  return new NextResponse(zipBuffer as any, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${name || 'my-pack'}.zip"`,
    },
  })
}

/** Проверяет, что две даты в разных месяцах */
function isDifferentMonth(a: Date, b: Date): boolean {
  return a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth()
}
