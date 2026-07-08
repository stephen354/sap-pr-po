/**
 * Local dev server with proxy to SAP endpoints.
 * Serves static files and forwards:
 *   /api/create-pr → SAP CREATE_PR
 *   /api/create-po → SAP CREATE_PO
 *
 * Usage: node server.js
 * Then open http://localhost:3001
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const SAP_HOST = '45.127.134.174';
const SAP_PORT = 8000;

const SAP_ENDPOINTS = {
  '/api/create-pr': '/bootcamp/STEV_TEST/CREATE_PR',
  '/api/create-po': '/bootcamp/STEV_TEST/CREATE_PO',
};

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  // --- Proxy routes ---
  if (req.method === 'POST' && SAP_ENDPOINTS[req.url]) {
    const sapPath = SAP_ENDPOINTS[req.url];
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const authToken = req.headers['x-sap-auth'];
      const headers = {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(body),
      };
      if (authToken) {
        headers['Authorization'] = 'Basic ' + authToken;
      }

      const options = {
        hostname: SAP_HOST,
        port: SAP_PORT,
        path: sapPath,
        method: 'POST',
        headers: headers,
      };

      console.log(`[PROXY] ${req.url} → ${sapPath}`);
      console.log('[PROXY] Body →', JSON.stringify(body));

      const proxy = http.request(options, (sapRes) => {
        let sapBody = '';
        sapRes.on('data', chunk => { sapBody += chunk; });
        sapRes.on('end', () => {
          // Extract error text from SAP HTML responses
          let responseText = sapBody;
          if (sapBody.includes('<html') || sapBody.includes('<HTML')) {
            const match = sapBody.match(/<b>\s*(.*?)\s*<\/b>/i);
            if (match) {
              responseText = 'Error: ' + match[1];
            } else {
              responseText = 'Error: SAP returned HTTP ' + sapRes.statusCode;
            }
          }
          console.log('[PROXY] SAP responded:', sapRes.statusCode, responseText.substring(0, 200));
          res.writeHead(sapRes.statusCode, { 'Content-Type': 'text/plain' });
          res.end(responseText);
        });
      });

      proxy.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Error: Tidak dapat terhubung ke server SAP — ' + err.message);
      });

      proxy.write(body);
      proxy.end();
    });
    return;
  }

  // --- Static files ---
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  SAP PR / PO Creator — dev server`);
  console.log(`  http://localhost:${PORT}\n`);
});
