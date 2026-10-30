import { environment } from '../../../environments/environment';

export const STORED_KEYS = {
  USER_TOKEN: 'user_token',
  USER_ID: 'user_id',
  USER_ROLE: 'user_role',
  baseUrl: (environment as any).apiBaseUrl || 'https://nileguide.runasp.net/api',
  AI_BASE_URL: (environment as any).aiBaseUrl || 'https://mini-rag-alpha.vercel.app/api/v1/nlp',
  get AI_ADMIN_URL(): string {
    return `${this.baseUrl}/admin/ai`;
  },
};
