import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Hosts send SIGTERM on every redeploy; this lets the DB pool close cleanly.
  app.enableShutdownHooks();

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
  console.log(`BizLedger API listening on http://localhost:${port}`);
}
bootstrap();
