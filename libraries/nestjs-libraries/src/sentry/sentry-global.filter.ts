
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SafeSentryFilter extends BaseExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {
    super(httpAdapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const userId =
      typeof request.getUser === 'function'
        ? request.getUser()?.id
        : undefined;

    // 🔐 Sentry captura sin romper rutas públicas
    Sentry.withScope(scope => {
      if (userId) {
        scope.setUser({ id: userId });
      }
      Sentry.captureException(exception);
    });

    super.catch(exception, host);
  }
}
