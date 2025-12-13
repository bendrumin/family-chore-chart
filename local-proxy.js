#!/usr/bin/env node
/**
 * Local Development Proxy
 * Mimics Vercel routing to test both vanilla JS and React versions together
 *
 * Usage: node local-proxy.js
 * Then visit http://localhost:3001
 */

const http = require('http');
const httpProxy = require('http-proxy');

const NEXT_JS_PORT = 3000;  // Next.js dev server
const VANILLA_PORT = 8080;   // Vanilla JS static server
const PROXY_PORT = 3001;     // This proxy server

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
  const url = req.url;

  // Log requests for debugging
  console.log(`[${new Date().toISOString()}] ${req.method} ${url}`);

  // Route Next.js static assets (must come before /app check)
  if (url.startsWith('/_next/')) {
    console.log(`  → Proxying Next.js asset: ${url}`);
    proxy.web(req, res, { target: `http://localhost:${NEXT_JS_PORT}` });
  }
  // Route /app/* to Next.js (React version)
  else if (url.startsWith('/app')) {
    // Remove /app prefix before proxying to Next.js
    req.url = url.replace('/app', '');
    if (req.url === '') req.url = '/dashboard'; // Default to dashboard for /app

    console.log(`  → Proxying to Next.js: ${req.url}`);
    proxy.web(req, res, { target: `http://localhost:${NEXT_JS_PORT}` });
  }
  // Route everything else to Vanilla JS
  else {
    console.log(`  → Proxying to Vanilla JS: ${url}`);
    proxy.web(req, res, { target: `http://localhost:${VANILLA_PORT}` });
  }
});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  res.writeHead(502, { 'Content-Type': 'text/plain' });
  res.end(`Proxy Error: ${err.message}\n\nMake sure both servers are running:\n- Next.js on port ${NEXT_JS_PORT}\n- Vanilla JS on port ${VANILLA_PORT}`);
});

server.listen(PROXY_PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🎯 ChoreStar Local Development Proxy                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Proxy running at: http://localhost:${PROXY_PORT}                  ║`);
  console.log('║                                                              ║');
  console.log('║  Routing:                                                    ║');
  console.log(`║    /app/*  → Next.js React (port ${NEXT_JS_PORT})                 ║`);
  console.log(`║    /*      → Vanilla JS (port ${VANILLA_PORT})                     ║`);
  console.log('║                                                              ║');
  console.log('║  Make sure both servers are running:                        ║');
  console.log('║    1. Next.js: cd chorestar-nextjs && npm run dev           ║');
  console.log('║    2. Vanilla: cd frontend && python3 -m http.server 8080   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
});
