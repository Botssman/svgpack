import { Lang } from './dict'

/**
 * Cookie name used to persist the user's preferred language.
 * Shared between client (i18n.tsx) and server (i18n-server.ts).
 *
 * Keep this file free of server-only / client-only imports so it can be
 * imported from both sides without tripping the 'server-only' guard.
 */
export const LANG_COOKIE = 'lang'
export const LANG_DEFAULT: Lang = 'ru'
