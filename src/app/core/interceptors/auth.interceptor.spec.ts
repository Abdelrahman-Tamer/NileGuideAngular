import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { authInterceptor, isTrustedUrl } from './auth.interceptor';
import { STORED_KEYS } from '../constants/Stored_keys';

describe('AuthInterceptor & isTrustedUrl Origin Guard', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  describe('isTrustedUrl', () => {
    it('should trust exact configured API base URL', () => {
      expect(isTrustedUrl(`${STORED_KEYS.baseUrl}/activities`)).toBe(true);
      expect(isTrustedUrl(`${STORED_KEYS.baseUrl}/admin/ai/files`)).toBe(true);
    });

    it('should trust same-origin relative URLs', () => {
      expect(isTrustedUrl('/api/activities')).toBe(true);
      expect(isTrustedUrl('api/activities')).toBe(true);
    });

    it('should reject protocol-relative URLs (//evil.com)', () => {
      expect(isTrustedUrl('//evil.com/api')).toBe(false);
      expect(isTrustedUrl('//nileguide.runasp.net/api')).toBe(false);
    });

    it('should reject untrusted subdomains and domain-suffix attacks', () => {
      expect(isTrustedUrl('https://evil.runasp.net/api')).toBe(false);
      expect(isTrustedUrl('https://nileguide.runasp.net.attacker.com/api')).toBe(false);
      expect(isTrustedUrl('https://fake-nileguide.online/api')).toBe(false);
    });

    it('should reject third-party external services and RAG host', () => {
      expect(isTrustedUrl('https://maps.googleapis.com/maps/api')).toBe(false);
      expect(isTrustedUrl('https://res.cloudinary.com/nileguide/image')).toBe(false);
      expect(isTrustedUrl('https://mini-rag-alpha.vercel.app/api/v1/nlp/chat')).toBe(false);
    });

    it('should reject malformed or non-http protocols', () => {
      expect(isTrustedUrl('javascript:alert(1)')).toBe(false);
      expect(isTrustedUrl('data:text/plain;base64,SGVsbG8=')).toBe(false);
      expect(isTrustedUrl('')).toBe(false);
      expect(isTrustedUrl(null as any)).toBe(false);
    });
  });

  describe('authInterceptor Execution', () => {
    it('should attach Bearer token to trusted API requests when token exists', () => {
      localStorage.setItem(STORED_KEYS.USER_TOKEN, 'test-jwt-token-123');

      httpClient.get(`${STORED_KEYS.baseUrl}/user/profile`).subscribe();

      const req = httpTesting.expectOne(`${STORED_KEYS.baseUrl}/user/profile`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-jwt-token-123');
      req.flush({});
    });

    it('should NOT attach Bearer token to untrusted external requests even when token exists', () => {
      localStorage.setItem(STORED_KEYS.USER_TOKEN, 'sensitive-jwt-token');

      httpClient.get('https://maps.googleapis.com/geocode/json').subscribe();

      const req = httpTesting.expectOne('https://maps.googleapis.com/geocode/json');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('should NOT attach Bearer token to direct mini-rag requests', () => {
      localStorage.setItem(STORED_KEYS.USER_TOKEN, 'sensitive-jwt-token');

      httpClient.post('https://mini-rag-alpha.vercel.app/api/v1/nlp/chat', {}).subscribe();

      const req = httpTesting.expectOne('https://mini-rag-alpha.vercel.app/api/v1/nlp/chat');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('should NOT attach Authorization header if no token is stored', () => {
      httpClient.get(`${STORED_KEYS.baseUrl}/activities`).subscribe();

      const req = httpTesting.expectOne(`${STORED_KEYS.baseUrl}/activities`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush([]);
    });
  });
});
