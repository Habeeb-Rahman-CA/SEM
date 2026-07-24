import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { cacheInterceptor } from './interceptors/cache.interceptor';
import { authInterceptor } from './interceptors/auth.interceptor';
import { retryInterceptor } from './interceptors/retry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(
      withFetch(),                                              // Use Fetch API (HTTP/2 multiplexing)
      withInterceptors([authInterceptor, retryInterceptor, cacheInterceptor]), // Auth token + auto retry + in-memory GET cache
    ),
  ]
};
