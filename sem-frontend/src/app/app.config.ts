import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter, withPreloading, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { QuicklinkStrategy, quicklinkProviders } from 'ngx-quicklink';

import { routes } from './app.routes';
import { cacheInterceptor } from './core/interceptors/cache.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { retryInterceptor } from './core/interceptors/retry.interceptor';
import { offlineInterceptor } from './core/interceptors/offline.interceptor';
import { AuthService } from './features/auth/services/auth.service';
import { CapacitorService } from './core/services/capacitor.service';

export function initializeApp(authService: AuthService, capacitor: CapacitorService) {
  return async () => {
    // Register Service Worker for offline PWA asset caching
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[ServiceWorker] Registered:', reg.scope))
        .catch((err) => console.warn('[ServiceWorker] Registration failed:', err));
    }

    void capacitor.initNativeShell();
    await authService.init();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    quicklinkProviders,
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withPreloading(QuicklinkStrategy),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(
      withFetch(), // Use Fetch API (HTTP/2 multiplexing)
      withInterceptors([authInterceptor, retryInterceptor, cacheInterceptor, offlineInterceptor]), // Auth token + auto retry + in-memory GET cache + IndexedDB offline interceptor
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService, CapacitorService],
      multi: true,
    },
  ],
};
