import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(compression());
  app.enableCors({
    origin: (origin, callback) => {
      // Allow all origins for development to ensure Tauri connectivity
      return callback(null, true);
    }, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Cache-Control',
      'Last-Event-ID',
      'Access-Control-Allow-Private-Network',
    ],
    credentials: true,
    exposedHeaders: [
      'Cache-Control',
      'Content-Language',
      'Content-Type',
      'Expires',
      'Last-Modified',
      'Pragma',
    ],
  });

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Private-Network', 'true');
    // Ensure OPTIONS requests (preflights) get the header and a 204 status
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Access-Control-Allow-Private-Network');
      return res.sendStatus(204);
    }
    next();
  });

  // Trust proxy for accurate IP detection
  const adapter = app.getHttpAdapter().getInstance();
  if (typeof adapter.set === 'function') {
    adapter.set('trust proxy', true);
  }

  const clientPath = join(__dirname, '..', 'client');
  const expressApp = app.getHttpAdapter().getInstance();

  if (existsSync(clientPath)) {
    // Production: serve static client files directly
    app.useStaticAssets(clientPath, { maxAge: '1d' });

    // SPA fallback: serve index.html for non-API routes
    expressApp.get('{*path}', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(join(clientPath, 'index.html'));
    });
  } else {
    // Dev mode: proxy non-API requests to Vite dev server
    const VITE_PORT = 1420;
    expressApp.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }

      const proxyOptions = {
        hostname: 'localhost',
        port: VITE_PORT,
        path: req.url,
        method: req.method,
        headers: req.headers,
      };

      const proxyReq = http.request(proxyOptions, (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });

      proxyReq.on('error', () => {
        res.status(502).json({ error: 'Vite dev server not available on port ' + VITE_PORT });
      });

      req.pipe(proxyReq, { end: true });
    });
  }

  await app.listen(process.env.PORT ?? 4100, '0.0.0.0');
}
bootstrap();
