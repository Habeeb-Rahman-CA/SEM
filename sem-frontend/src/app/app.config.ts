import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withPreloading } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { QuicklinkStrategy, quicklinkProviders } from 'ngx-quicklink';

import { routes } from './app.routes';
import { cacheInterceptor } from './core/interceptors/cache.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { retryInterceptor } from './core/interceptors/retry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    quicklinkProviders,
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withPreloading(QuicklinkStrategy)),
    provideHttpClient(
      withFetch(), // Use Fetch API (HTTP/2 multiplexing)
      withInterceptors([authInterceptor, retryInterceptor, cacheInterceptor]), // Auth token + auto retry + in-memory GET cache
    ),
  ],
};
