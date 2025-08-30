import { loadSwagger } from '@gitroom/helpers/swagger/load.swagger';

process.env.TZ = 'UTC';

import cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { initializeSentry } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';
initializeSentry('backend', true);

import { SubscriptionExceptionFilter } from '@gitroom/backend/services/auth/permissions/subscription.exception';
import { HttpExceptionFilter } from '@gitroom/nestjs-libraries/services/exception.filter';
import { ConfigurationChecker } from '@gitroom/helpers/configuration/configuration.checker';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    cors: {
      ...(!process.env.NOT_SECURED ? { credentials: true } : {}),
      exposedHeaders: [
        'reload',
        'onboarding',
        'activate',
        ...(process.env.NOT_SECURED ? ['auth', 'showorg', 'impersonate'] : []),
      ],
      origin: [
        process.env.FRONTEND_URL,
        ...(process.env.MAIN_URL ? [process.env.MAIN_URL] : []),
      ],
    },
  });

  // ✅ Middleware para proteger rutas públicas de errores con getUser
  app.use((req: any, _res, next) => {
    if (typeof req.getUser !== 'function') {
      req.getUser = () => null;
    }
    next();
  });

  // ✅ Registro único de filtros globales
  app.useGlobalFilters(
    new SubscriptionExceptionFilter(),
    new HttpExceptionFilter()
  );

  // ✅ Prefijo global
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    })
  );

  app.use(cookieParser());

  loadSwagger(app);

  const port = process.env.PORT || 3000;

  try {
    await app.listen(port);
  Logger.log('🟢 Shim activo — getUser por defecto está registrado');

    checkConfiguration();

    Logger.log(`🚀 Backend is running on: http://localhost:${port}`);
  } catch (e) {
    Logger.error(`Backend failed to start on port ${port}`, e);
  }
}

function checkConfiguration() {
  const checker = new ConfigurationChecker();
  checker.readEnvFromProcess();
  checker.check();

  if (checker.hasIssues()) {
    for (const issue of checker.getIssues()) {
      Logger.warn(issue, 'Configuration issue');
    }

    Logger.warn('Configuration issues found: ' + checker.getIssuesCount());
  } else {
    Logger.log('Configuration check completed without any issues.');
  }
}

bootstrap();
