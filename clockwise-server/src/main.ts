import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  // Manually add the header if enableCors doesn't support the 'preflightContinue' or specific PNA option directly in this NestJS version context,
  // but typically we can try using a middleware or just ensuring the header is there.
  // Actually, NestJS/Express cors wrapper might usually be just `cors` package.
  // The `cors` package doesn't have a direct `privateNetwork` option in older versions, but we can check.
  // Safest is to just add a global middleware that adds the header if needed, or rely on `cors` configuration if it supports it.
  // Let's try adding a simple middleware for this specific header if the above doesn't work,
  // but simpler first: app.use((req, res, next) => { res.header('Access-Control-Allow-Private-Network', 'true'); next(); });

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
  await app.listen(process.env.PORT ?? 4100, '0.0.0.0');
}
bootstrap();
