export interface LinkPreviewSeed {
  url: string;
  title: string;
  description: string;
  siteName: string;
  faviconUrl?: string;
}

export function buildLinkPreviewSeed(url: string): LinkPreviewSeed {
  try {
    const domain = new URL(url).hostname;
    return {
      url,
      title: `Resource Preview for ${domain}`,
      description: `Official documentation, media preview, and live workspace assets from ${domain}.`,
      siteName: domain,
      faviconUrl: `https://${domain}/favicon.ico`,
    };
  } catch {
    return {
      url,
      title: 'Shared Link Preview',
      description: 'Official workspace resource reference.',
      siteName: 'External Resource',
    };
  }
}
