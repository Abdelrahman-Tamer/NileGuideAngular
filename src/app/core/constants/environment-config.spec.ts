import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  STORED_KEYS,
  PRODUCTION_AI_URL,
  validateAiBaseUrl,
  resolveAiBaseUrl,
} from './Stored_keys';
import { ChatbotService } from '../components/chatbot/chatbot.service';

describe('Environment-Safe AI Configuration Runtime', () => {
  let httpTesting: HttpTestingController;
  let chatbotService: ChatbotService;

  beforeEach(() => {
    delete (window as any).__NILEGUIDE_CONFIG__;
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ChatbotService,
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    chatbotService = TestBed.inject(ChatbotService);
  });

  afterEach(() => {
    delete (window as any).__NILEGUIDE_CONFIG__;
    sessionStorage.clear();
    httpTesting.verify();
  });

  describe('1. Runtime URL Validation (validateAiBaseUrl)', () => {
    it('accepts valid HTTPS URL ending in /api/v1/nlp', () => {
      const res = validateAiBaseUrl('https://example.com/api/v1/nlp');
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe('https://example.com/api/v1/nlp');
    });

    it('accepts localhost HTTP URL ending in /api/v1/nlp for local development', () => {
      const res = validateAiBaseUrl('http://localhost:8000/api/v1/nlp');
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe('http://localhost:8000/api/v1/nlp');
    });

    it('rejects plain HTTP for non-localhost domains', () => {
      const res = validateAiBaseUrl('http://insecure-domain.com/api/v1/nlp');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Protocol must be https:');
    });

    it('rejects URLs missing /api/v1/nlp path suffix', () => {
      const res = validateAiBaseUrl('https://example.com/api/v2/chat');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('URL path must end with /api/v1/nlp');
    });

    it('rejects non-URL or empty strings', () => {
      expect(validateAiBaseUrl('').valid).toBe(false);
      expect(validateAiBaseUrl(null).valid).toBe(false);
      expect(validateAiBaseUrl('not-a-url').valid).toBe(false);
    });
  });

  describe('2. Runtime AI_BASE_URL Resolution & Isolation', () => {
    it('Scenario 1: VERCEL_ENV=preview with valid Preview URL resolves cleanly', () => {
      const previewUrl = 'https://mini-cyujr9ept-abdelrahmans-projects-edb40826.vercel.app/api/v1/nlp';
      (window as any).__NILEGUIDE_CONFIG__ = {
        environment: 'preview',
        aiBaseUrl: previewUrl,
      };

      expect(STORED_KEYS.AI_BASE_URL).toBe(previewUrl);
    });

    it('Scenario 2: VERCEL_ENV=preview throws if URL is missing or empty (blocks silent fallback)', () => {
      (window as any).__NILEGUIDE_CONFIG__ = {
        environment: 'preview',
        aiBaseUrl: '',
      };

      expect(() => STORED_KEYS.AI_BASE_URL).toThrow(/Preview deployment is missing required NILEGUIDE_AI_BASE_URL/);
    });

    it('Scenario 3: VERCEL_ENV=preview throws if URL points to mini-rag-alpha.vercel.app', () => {
      (window as any).__NILEGUIDE_CONFIG__ = {
        environment: 'preview',
        aiBaseUrl: 'https://mini-rag-alpha.vercel.app/api/v1/nlp',
      };

      expect(() => STORED_KEYS.AI_BASE_URL).toThrow(/Preview deployment cannot be configured with Production AI backend URL/);
    });

    it('Scenario 4: VERCEL_ENV=production strictly resolves to Production API', () => {
      (window as any).__NILEGUIDE_CONFIG__ = {
        environment: 'production',
        aiBaseUrl: PRODUCTION_AI_URL,
      };

      expect(STORED_KEYS.AI_BASE_URL).toBe(PRODUCTION_AI_URL);
    });

    it('Scenario 5: VERCEL_ENV=production throws if a preview URL is passed', () => {
      (window as any).__NILEGUIDE_CONFIG__ = {
        environment: 'production',
        aiBaseUrl: 'https://mini-cyujr9ept-abdelrahmans-projects-edb40826.vercel.app/api/v1/nlp',
      };

      expect(() => STORED_KEYS.AI_BASE_URL).toThrow(/Production deployment cannot use a Preview AI backend URL/);
    });

    it('Scenario 6: Development configuration preserves local default behavior', () => {
      delete (window as any).__NILEGUIDE_CONFIG__;
      sessionStorage.clear();

      expect(STORED_KEYS.AI_BASE_URL).toBe(PRODUCTION_AI_URL);
    });

    it('Scenario 7: Stale sessionStorage Production override CANNOT override a Preview deployment', () => {
      const previewUrl = 'https://mini-cyujr9ept-abdelrahmans-projects-edb40826.vercel.app/api/v1/nlp';
      // User has stale Production URL stored in sessionStorage
      sessionStorage.setItem('nileguide_ai_base_url', PRODUCTION_AI_URL);

      // Deployed Preview configuration
      (window as any).__NILEGUIDE_CONFIG__ = {
        environment: 'preview',
        aiBaseUrl: previewUrl,
      };

      // Stale sessionStorage MUST be ignored on Preview deployment
      expect(STORED_KEYS.AI_BASE_URL).toBe(previewUrl);
    });

    it('honors valid sessionStorage override in development context', () => {
      const localDevUrl = 'https://custom-dev-instance.example.com/api/v1/nlp';
      sessionStorage.setItem('nileguide_ai_base_url', localDevUrl);

      expect(STORED_KEYS.AI_BASE_URL).toBe(localDevUrl);
    });

    it('ignores invalid sessionStorage override in development context and falls back safely', () => {
      sessionStorage.setItem('nileguide_ai_base_url', 'invalid-http-url');

      expect(STORED_KEYS.AI_BASE_URL).toBe(PRODUCTION_AI_URL);
    });
  });

  describe('3. Network-Level Chatbot Service Routing Isolation', () => {
    it('Preview mode dispatches HTTP requests strictly to Preview backend and NEVER to Production hostname', () => {
      const previewUrl = 'https://mini-cyujr9ept-abdelrahmans-projects-edb40826.vercel.app/api/v1/nlp';
      (window as any).__NILEGUIDE_CONFIG__ = {
        environment: 'preview',
        aiBaseUrl: previewUrl,
      };

      chatbotService.createGuestSession().subscribe();

      // Verify request reached Preview URL
      const previewReq = httpTesting.expectOne(`${previewUrl}/guest/session`);
      expect(previewReq.request.url).toBe(`${previewUrl}/guest/session`);
      expect(previewReq.request.url).not.toContain('mini-rag-alpha.vercel.app');

      // Verify ZERO requests were sent to Production
      httpTesting.expectNone(`${PRODUCTION_AI_URL}/guest/session`);

      previewReq.flush({
        guest_token: 'tok_prev_test',
        guest_id: 'g_prev_test',
        session_id: 's_prev_test',
        daily_limit: 5,
        remaining_questions: 3,
        inactivity_ttl_seconds: 1800,
      });
    });
  });
});
