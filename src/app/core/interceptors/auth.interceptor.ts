import { HttpInterceptorFn } from '@angular/common/http';
import { STORED_KEYS } from '../constants/Stored_keys';

/**
 * Safely determines if an outgoing HTTP request URL belongs strictly to the trusted
 * NileGuide API origin. Rejects protocol-relative URLs (e.g. //evil.com), untrusted
 * third-party APIs (Cloudinary, Google Maps, mini-rag, external CDNs), and loose domain suffixes.
 */
export const isTrustedUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();

  // Reject protocol-relative URLs (e.g. //evil.com/api)
  if (trimmed.startsWith('//')) {
    return false;
  }

  // Accept valid same-origin relative paths (e.g. /api/activities)
  if (trimmed.startsWith('/') || (!trimmed.includes('://') && !trimmed.startsWith('//') && !trimmed.includes(':'))) {
    return true;
  }

  // Parse absolute URLs and match exact origin
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Collect trusted origins strictly from configured API and browser origin
    const trustedOrigins = new Set<string>();

    if (STORED_KEYS.baseUrl) {
      try {
        const baseParsed = new URL(STORED_KEYS.baseUrl);
        trustedOrigins.add(baseParsed.origin.toLowerCase());
      } catch {
        // BaseUrl might be relative in some test/dev configs
      }
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
      trustedOrigins.add(window.location.origin.toLowerCase());
    }

    return trustedOrigins.has(parsed.origin.toLowerCase());
  } catch {
    return false;
  }
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORED_KEYS.USER_TOKEN)
      : null;

  if (!token || !isTrustedUrl(req.url)) {
    return next(req);
  }

  const cleanToken = token.replace(/^"|"$/g, '');

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${cleanToken}`,
    },
  });

  return next(authReq);
};
