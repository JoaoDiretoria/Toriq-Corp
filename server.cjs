const express = require('express');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitado para permitir inline scripts do Vite
  crossOriginEmbedderPolicy: false
}));
const port = parseInt(process.env.PORT || '3001', 10);
const distPath = path.join(__dirname, 'dist');

console.log(`[Server] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[Server] Starting server on port ${port}`);
console.log(`[Server] Serving files from: ${distPath}`);
console.log(`[Server] Dist directory exists: ${fs.existsSync(distPath)}`);
console.log(`[Server] FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set'}`);
console.log(`[Server] ESOCIAL_AMBIENTE: ${process.env.ESOCIAL_AMBIENTE || 'not set'}`);

if (!fs.existsSync(distPath)) {
  console.error(`[Server] ERROR: Dist directory not found at ${distPath}`);
  process.exit(1);
}

if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath);
  console.log(`[Server] Files in dist: ${files.join(', ')}`);
}

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Request] ${req.method} ${req.url}`);
  console.log(`[${timestamp}] [Headers] Host: ${req.get('host')}, User-Agent: ${req.get('user-agent')}`);
  console.log(`[${timestamp}] [IP] ${req.ip || req.connection.remoteAddress}`);
  
  res.on('finish', () => {
    console.log(`[${timestamp}] [Response] ${req.method} ${req.url} -> ${res.statusCode}`);
  });
  
  res.on('error', (err) => {
    console.error(`[${timestamp}] [Response Error] ${req.method} ${req.url}:`, err.message);
  });
  
  next();
});

app.get('/health', (req, res) => {
  console.log(`[Health] Endpoint called`);
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    port: port,
    nodeEnv: process.env.NODE_ENV
  });
});

app.use(express.static(distPath, {
  maxAge: '1h',
  etag: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

app.use((err, req, res, next) => {
  console.error('[Error] Middleware caught error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.use((req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  console.log(`[Fallback] Serving index.html for ${req.url}`);
  console.log(`[Fallback] Index.html exists: ${fs.existsSync(indexPath)}`);
  
  if (!fs.existsSync(indexPath)) {
    console.error(`[Error] index.html not found at ${indexPath}`);
    return res.status(404).send('index.html not found');
  }
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`[Error] Failed to send index.html: ${err.message}`);
      console.error(`[Error] Full path: ${indexPath}`);
      console.error(`[Error] Error code: ${err.code}`);
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
      }
    }
  });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[Server] ✓ Server running on port ${port}`);
  console.log(`[Server] ✓ Ready to accept connections`);
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

server.on('error', (err) => {
  console.error('[Server] Server error:', err);
  process.exit(1);
});
