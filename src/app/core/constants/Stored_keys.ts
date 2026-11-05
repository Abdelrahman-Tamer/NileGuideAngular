import { environment } from '../../../environments/environment';

export interface NileGuideRuntimeConfig {
  environment: 'production' | 'preview' | 'development' | 'test';
  aiBaseUrl: string;
  generatedAt?: string;
}

declare global {
  interface Window {
    __NILEGUIDE_CONFIG__?: NileGuideRuntimeConfig;
  }
}

export const PRODUCTION_AI_URL = 'https://mini-rag-alpha.vercel.app/api/v1/nlp';

export interface UrlValidationResult {
  valid: boolean;
  normalized?: string;
  reason?: string;
}

export function validateAiBaseUrl(url: string | null | undefined): UrlValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: 'URL must be a non-empty string' };
  }
  const trimmed = url.trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(trimmed);
    const isHttps = parsed.protocol === 'https:';
    const isLocalHttp = parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
    if (!isHttps && !isLocalHttp) {
      return { valid: false, reason: `Protocol must be https: (got ${parsed.protocol})` };
    }
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return { valid: false, reason: 'Hostname is missing or invalid' };
    }
    const pathname = parsed.pathname.replace(/\/+$/, '');
    if (!pathname.endsWith('/api/v1/nlp')) {
      return { valid: false, reason: `URL path must end with /api/v1/nlp (got ${parsed.pathname})` };
    }
    return { valid: true, normalized: trimmed };
  } catch (err: any) {
    return { valid: false, reason: `Malformed URL: ${err?.message || 'parse error'}` };
  }
}

export function resolveAiBaseUrl(): string {
  const isBrowser = typeof window !== 'undefined';
  const runtimeConfig = isBrowser ? window.__NILEGUIDE_CONFIG__ : undefined;
  const buildEnv = runtimeConfig?.environment || 'development';

  // 1. VERCEL PREVIEW DEPLOYMENT
  if (buildEnv === 'preview') {
    const rawPreviewUrl = runtimeConfig?.aiBaseUrl;
    if (!rawPreviewUrl || !rawPreviewUrl.trim()) {
      throw new Error(
        '[NileGuide Config] Preview deployment is missing required NILEGUIDE_AI_BASE_URL. ' +
        'Silent fallback to Production is blocked.'
      );
    }
    const val = validateAiBaseUrl(rawPreviewUrl);
    if (!val.valid) {
      throw new Error(`[NileGuide Config] Invalid Preview AI_BASE_URL "${rawPreviewUrl}": ${val.reason}`);
    }
    if (val.normalized!.includes('mini-rag-alpha.vercel.app')) {
      throw new Error(
        '[NileGuide Config] Preview deployment cannot be configured with Production AI backend URL (mini-rag-alpha.vercel.app).'
      );
    }
    return val.normalized!;
  }

  // 2. VERCEL PRODUCTION DEPLOYMENT
  if (buildEnv === 'production') {
    const rawProdUrl = runtimeConfig?.aiBaseUrl || (environment as any).aiBaseUrl || PRODUCTION_AI_URL;
    const val = validateAiBaseUrl(rawProdUrl);
    if (!val.valid) {
      throw new Error(`[NileGuide Config] Invalid Production AI_BASE_URL "${rawProdUrl}": ${val.reason}`);
    }
    if (val.normalized!.includes('mini-cyujr9ept') || val.normalized!.includes('-git-fix-')) {
      throw new Error('[NileGuide Config] Production deployment cannot use a Preview AI backend URL.');
    }
    return val.normalized!;
  }

  // 3. DEVELOPMENT / TEST CONTEXT
  // Stale sessionStorage overrides are ONLY honored in a development/test context
  if (isBrowser && typeof sessionStorage !== 'undefined') {
    const sessionOverride = sessionStorage.getItem('nileguide_ai_base_url');
    if (sessionOverride) {
      const val = validateAiBaseUrl(sessionOverride);
      if (val.valid) {
        return val.normalized!;
      }
    }
  }

  if (runtimeConfig?.aiBaseUrl) {
    const val = validateAiBaseUrl(runtimeConfig.aiBaseUrl);
    if (val.valid) {
      return val.normalized!;
    }
  }

  return ((environment as any).aiBaseUrl || PRODUCTION_AI_URL).trim().replace(/\/+$/, '');
}

export const STORED_KEYS = {
  USER_TOKEN: 'user_token',
  USER_ID: 'user_id',
  USER_ROLE: 'user_role',
  baseUrl: (environment as any).apiBaseUrl || 'https://nileguide.runasp.net/api',
  get AI_BASE_URL(): string {
    return resolveAiBaseUrl();
  },
  get AI_ADMIN_URL(): string {
    return `${this.baseUrl}/admin/ai`;
  },
};
