import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export interface WorkspaceBranding {
  id: string;
  workspaceId: string;
  isEnabled: boolean;
  brandName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  customDomain: string | null;
  customDomainToken: string | null;
  customDomainVerified: boolean;
  loginMessage: string | null;
  loginBackgroundUrl: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
  emailHeaderHtml: string | null;
  emailFooterHtml: string | null;
  pdfHeaderHtml: string | null;
  pdfFooterHtml: string | null;
  socialLinks: {
    website?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    youtube?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicBrandingView {
  workspaceId: string;
  workspaceSlug: string;
  isEnabled: boolean;
  brandName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  loginMessage: string | null;
  loginBackgroundUrl: string | null;
  socialLinks: WorkspaceBranding['socialLinks'];
}

export type UpdateBrandingPayload = Partial<
  Omit<
    WorkspaceBranding,
    'id' | 'workspaceId' | 'customDomainToken' | 'customDomainVerified' | 'createdAt' | 'updatedAt'
  >
>;

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  /**
   * Public branding for the current window — populated on app boot from
   * host / query string. `null` when running with default Taisen branding.
   * Components can subscribe via the signal.
   */
  activeBranding = signal<PublicBrandingView | null>(null);

  private get authHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private base(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/branding`;
  }

  // ─── Auth ────────────────────────────────────────────────────────

  get(workspaceId: string): Observable<WorkspaceBranding> {
    return this.http.get<WorkspaceBranding>(this.base(workspaceId), {
      headers: this.authHeaders,
    });
  }

  update(workspaceId: string, payload: UpdateBrandingPayload): Observable<WorkspaceBranding> {
    return this.http.patch<WorkspaceBranding>(this.base(workspaceId), payload, {
      headers: this.authHeaders,
    });
  }

  verifyDomain(workspaceId: string): Observable<WorkspaceBranding> {
    return this.http.post<WorkspaceBranding>(
      `${this.base(workspaceId)}/verify-domain`,
      {},
      { headers: this.authHeaders },
    );
  }

  // ─── Public ──────────────────────────────────────────────────────

  /**
   * Resolve branding for the current window. Prefers `?workspace=<slug>`
   * query param (useful for direct login links), then falls back to the
   * Host header (custom domain deployments). Silent on failure.
   *
   * Side-effects: on success, applies the branding to :root via CSS
   * custom properties (--brand-primary, --brand-secondary, --brand-accent),
   * updates the document title if a brandName is present, and swaps the
   * favicon if one is configured.
   */
  resolveForCurrentWindow(): Observable<PublicBrandingView | null> {
    const params: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('workspace');
      if (q) params['slug'] = q;
    }
    return this.http
      .get<PublicBrandingView | null>(`${environment.apiUrl}/public/branding`, {
        params,
      })
      .pipe(
        tap((branding) => {
          this.activeBranding.set(branding);
          this.applyToDocument(branding);
        }),
      );
  }

  /**
   * Sets CSS custom properties on :root so any Tailwind arbitrary value
   * or plain CSS rule can reference brand colours (e.g. class="text-[var(--brand-primary)]").
   */
  private applyToDocument(branding: PublicBrandingView | null): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!branding || !branding.isEnabled) {
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-secondary');
      root.style.removeProperty('--brand-accent');
      return;
    }
    if (branding.primaryColor) root.style.setProperty('--brand-primary', branding.primaryColor);
    if (branding.secondaryColor)
      root.style.setProperty('--brand-secondary', branding.secondaryColor);
    if (branding.accentColor) root.style.setProperty('--brand-accent', branding.accentColor);

    if (branding.brandName && typeof document.title === 'string') {
      document.title = `${branding.brandName} · Taisen`;
    }
    if (branding.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
  }
}
