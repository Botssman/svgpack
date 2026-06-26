import type { MetadataRoute } from 'next'

const BASE = 'https://iconpackhub.dev' // change to real domain when known

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account', '/admin', '/api'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
