import { APP_FILTER } from '@nestjs/core';
import { SafeSentryFilter } from './sentry-global.filter';

export const FILTER = {
  provide: APP_FILTER,
  useClass: SafeSentryFilter,
};
