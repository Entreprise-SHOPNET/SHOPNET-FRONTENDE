const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

// Create HTTP server that proxies to Expo dev server
const server = http.createServer((req, res) => {
  // Set headers to allow iframe embedding (for Replit webview)
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Proxy to Expo web dev server on port 8081
  proxy.web(req, res, { 
    target: 'http://localhost:8081',
    changeOrigin: true,
    // Forward original host header to avoid Expo security check
    headers: {
      host: 'localhost:8081',
      origin: 'http://localhost:8081',
      referer: 'http://localhost:8081/'
    }
  }, (err) => {
    console.error('Proxy error - Expo server may not be ready yet');
    res.writeHead(502);
    res.end(`
      <html>
        <head><title>Loading...</title></head>
        <body>
          <h1>Expo Dev Server Starting...</h1>
          <p>Please wait while the development server starts up. This may take a minute.</p>
          <p>This page will auto-refresh in 5 seconds.</p>
          <script>setTimeout(() => location.reload(), 5000);</script>
        </body>
      </html>
    `);
  });
});

// Handle WebSocket upgrade for hot reload
server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head, {
    target: 'ws://localhost:8081',
  });
});

// Listen on port 5000
const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on http://0.0.0.0:${PORT}`);
  console.log(`Forwarding to Expo dev server on http://localhost:8081`);
  console.log(`Waiting for Expo to start...`);
});

// Handle proxy errors gracefully
proxy.on('error', (err, req, res) => {
  // Silently handle expected errors during startup
  if (err.code !== 'ECONNREFUSED' && err.code !== 'ECONNRESET') {
    console.error('Proxy error:', err.code);
  }
});
