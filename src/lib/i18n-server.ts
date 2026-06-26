import 'server-only'
import { cookies } from 'next/headers'
import { dict, Lang, Dict } from './dict'
import { LANG_COOKIE, LANG_DEFAULT } from './i18n-constants'

export { LANG_COOKIE, LANG_DEFAULT }

/**
 * Read the user's preferred language from the cookie on the server side.
 * Falls back to LANG_DEFAULT ('ru') when unset or invalid.
 *
 * Use in server components and route handlers:
 *   const lang = await getLang()
 *   const t = getDict(lang)
 */
export async function getLang(): Promise<Lang> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(LANG_COOKIE)?.value
  if (raw === 'ru' || raw === 'en') return raw
  return LANG_DEFAULT
}

/**
 * Synchronous dict accessor — pass the lang you already resolved via getLang().
 */
export function getDict(lang: Lang): Dict {
  return dict[lang]
}
