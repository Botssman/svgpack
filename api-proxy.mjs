import http from 'http';
import https from 'https';
import { URL } from 'url';

const TARGET = 'https://internal-api.z.ai';
const PORT = 3000;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, TARGET);
  
  // Strip XTransformPort from query params
  url.searchParams.delete('XTransformPort');
  
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: url.hostname,
    },
  };

  // Remove proxy-specific headers that shouldn't be forwarded
  delete options.headers['x-forwarded-for'];
  delete options.headers['x-forwarded-proto'];
  delete options.headers['x-real-ip'];

  const proxy = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxy.on('error', (err) => {
    console.error('[proxy] Error:', err.message);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxy);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`API proxy running on port ${PORT} -> ${TARGET}`);
});
