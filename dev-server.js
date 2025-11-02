#!/usr/bin/env node

// Simple development server for ChoreStar
// Handles static files and API routes

require('dotenv').config(); // Load environment variables

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createServer } = require('http');
const { parse } = require('url');

const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, 'frontend');
const API_DIR = path.join(FRONTEND_DIR, 'api');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'application/font-woff',
  '.woff2': 'application/font-woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  let pathname = parsedUrl.pathname;

  console.log(`[${req.method}] ${pathname}`);

    // Handle API routes
  if (pathname.startsWith('/api/')) {
    const apiPath = pathname.replace('/api/', '').replace(/\/$/, '');
    let apiFile = path.join(API_DIR, `${apiPath}.js`);
    
    // If no extension, try with .js
    if (!fs.existsSync(apiFile) && !apiPath.endsWith('.js')) {
      apiFile = path.join(API_DIR, `${apiPath}.js`);
    }
    
    if (fs.existsSync(apiFile)) {
      // Handle request body first
      const handleRequest = (bodyData) => {
        try {
          // Clear require cache for hot reloading (only in development)
          if (process.env.NODE_ENV !== 'production') {
            delete require.cache[require.resolve(apiFile)];
          }
          
          // Load and execute API handler
          const handler = require(apiFile);
          const handlerFunc = handler.default || handler;
          
          if (typeof handlerFunc !== 'function') {
            throw new Error(`Handler is not a function: ${typeof handlerFunc}`);
          }
          
          // Mock Vercel request/response
          const mockReq = {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: bodyData,
            query: parsedUrl.query,
            // Add some common properties
            ip: req.socket.remoteAddress,
            connection: req.connection
          };
          
          let responseSent = false;
          const mockRes = {
            status: (code) => {
              if (!responseSent) {
                res.statusCode = code;
              }
              return mockRes;
            },
            json: (data) => {
              if (!responseSent) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                responseSent = true;
              }
            },
            send: (data) => {
              if (!responseSent) {
                res.end(data);
                responseSent = true;
              }
            },
            setHeader: (name, value) => {
              if (!responseSent) {
                res.setHeader(name, value);
              }
            },
            end: (data) => {
              if (!responseSent) {
                res.end(data);
                responseSent = true;
              }
            }
          };

          // Call the handler
          const result = handlerFunc(mockReq, mockRes);
          
          // Handle async handlers
          if (result && typeof result.then === 'function') {
            result.catch(err => {
              if (!responseSent) {
                console.error('API handler error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
                responseSent = true;
              }
            });
          }
        } catch (error) {
          console.error('Error executing API handler:', error);
          if (!responseSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message || 'Internal server error', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined }));
          }
        }
      };

      // Get request body if it's a POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const bodyData = body ? JSON.parse(body) : {};
            handleRequest(bodyData);
          } catch (e) {
            // If not JSON, pass as string
            handleRequest(body);
          }
        });
      } else {
        handleRequest(null);
      }
      return;
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `API endpoint not found: ${apiPath}` }));
      return;
    }
  }

  // Handle static files
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(FRONTEND_DIR, pathname);
  const ext = path.parse(filePath).ext;
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.exists(filePath, (exists) => {
    if (!exists) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html');
      res.end(`<h1>404 - File Not Found</h1><p>${pathname}</p>`);
      return;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.statusCode = 500;
        res.end(`Error loading file: ${err.message}`);
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      
      // Add CORS headers for development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   ChoreStar Development Server            ║
╚════════════════════════════════════════════╝

🚀 Server running at http://localhost:${PORT}
📁 Serving files from: ${FRONTEND_DIR}
🔌 API routes from: ${API_DIR}

💡 Tips:
   - Open http://localhost:${PORT} in your browser
   - API endpoints: http://localhost:${PORT}/api/*
   - Make sure your Supabase credentials are set in frontend/supabase-config.js

Press Ctrl+C to stop the server
`);
});

