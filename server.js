/**
 * Custom Next.js server for SVG Icon Pack
 *
 * Key fixes:
 * - Rewrites Host header to localhost (Caddy sends external host, which crashes Next.js SSR)
 * - Uses --max-old-space-size=2048 to prevent OOM on large pages
 * - Uses z-ai CLI instead of fetch() (fetch to internal-api.z.ai crashes Node.js on this machine)
 * - Proxied by Caddy on port 81 → this server on port 3000
 */

const { createServer } = require('http');
const { parse: parseUrl } = require('url');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dir: __dirname, dev: false, hostname: 'localhost', port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    // Rewrite Host header — Caddy proxies with external host header,
    // which causes Next.js to crash during SSR rendering
    const origHost = req.headers.host;
    req.headers.host = `localhost:${port}`;
    if (origHost) req.headers['x-forwarded-host'] = origHost;

    handle(req, res, parseUrl(req.url, true)).catch(err => {
      console.error(`[Error] ${req.method} ${req.url}: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    });
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`SVG Icon Pack ready on :${port}`);
  });

  // Keep running even on uncaught errors
  process.on('uncaughtException', (err) => {
    console.error('[Uncaught]', err.message);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Rejection]', reason);
  });
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
