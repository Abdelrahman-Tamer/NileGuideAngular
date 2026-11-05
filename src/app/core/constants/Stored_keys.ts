import { environment } from '../../../environments/environment';

export const STORED_KEYS = {
  USER_TOKEN: 'user_token',
  USER_ID: 'user_id',
  USER_ROLE: 'user_role',
  baseUrl: (environment as any).apiBaseUrl || 'https://nileguide.runasp.net/api',
  get AI_BASE_URL(): string {
    // 1. Runtime override via window.__NILEGUIDE_CONFIG__ (for zero-build Preview injection)
    if (typeof window !== 'undefined' && (window as any).__NILEGUIDE_CONFIG__?.aiBaseUrl) {
      return (window as any).__NILEGUIDE_CONFIG__.aiBaseUrl.trim();
    }
    // 2. Runtime override via sessionStorage (for automated Preview / E2E test suites)
    if (typeof sessionStorage !== 'undefined') {
      const override = sessionStorage.getItem('nileguide_ai_base_url');
      if (override && override.startsWith('https://')) {
        return override.trim().replace(/\/+$/, '');
      }
    }
    // 3. Statically compiled environment configuration (defaults to Production)
    return (environment as any).aiBaseUrl || 'https://mini-rag-alpha.vercel.app/api/v1/nlp';
  },
  get AI_ADMIN_URL(): string {
    return `${this.baseUrl}/admin/ai`;
  },
};
