import './database/pg-types';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Hosts send SIGTERM on every redeploy; this lets the DB pool close cleanly.
  app.enableShutdownHooks();

  // Behind Render's proxy every request would otherwise appear to come from the
  // proxy, so per-IP rate limits would throttle all users together.
  const trustProxy = config.get<number>('trustProxy') ?? 0;
  if (trustProxy > 0) app.set('trust proxy', trustProxy);

  // Standard security headers (HSTS, nosniff, frame and referrer policies, no
  // X-Powered-By). Product photos are fetched by the app from another origin
  // during web development, so resources may be shared cross-origin; they are
  // still protected by the Authorization header.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use(compression());

  // Unset in dev: permissive (nothing breaks locally). Unset in production:
  // closed — CORS has to be an intentional allowlist, not an accident.
  // React Native itself isn't subject to browser CORS, so this only
  // matters for a future web frontend/admin panel or as a guard against
  // arbitrary sites calling the API from a browser.
  const corsOrigins = config.get<string>('corsOrigins');
  const isProduction = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',').map((o) => o.trim()) : !isProduction,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`BizLedger API listening on port ${port}`);
}
bootstrap();
