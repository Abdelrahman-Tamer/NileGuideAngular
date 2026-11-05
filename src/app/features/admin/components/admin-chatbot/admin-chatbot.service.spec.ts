import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { STORED_KEYS } from '../../../../core/constants/Stored_keys';
import {
  AdminChatbotService,
  AiFilesListResponse,
} from './admin-chatbot.service';

describe('AdminChatbotService', () => {
  let service: AdminChatbotService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminChatbotService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should dynamically adapt AI_ADMIN_URL when STORED_KEYS.baseUrl changes', () => {
    const originalBaseUrl = STORED_KEYS.baseUrl;
    try {
      STORED_KEYS.baseUrl = 'https://staging-api.nileguide.online/api';
      expect(STORED_KEYS.AI_ADMIN_URL).toBe('https://staging-api.nileguide.online/api/admin/ai');
    } finally {
      STORED_KEYS.baseUrl = originalBaseUrl;
    }
  });

  it('should route getFiles through secure backend admin proxy and never transmit X-Admin-Api-Key', () => {
    const mockResponse: AiFilesListResponse = {
      assets: [
        {
          file_id: 'file_1',
          asset_name: 'cairo_guide.txt',
          file_size: 1024,
          uploaded_at: '2026-10-27T08:00:00Z',
        },
      ],
    };

    service.getFiles().subscribe((res) => {
      expect(res.assets.length).toBe(1);
      expect(res.assets[0].asset_name).toBe('cairo_guide.txt');
    });

    const req = httpTesting.expectOne(`${STORED_KEYS.AI_ADMIN_URL}/files`);
    expect(req.request.method).toBe('GET');
    // Security check: Client browser must NEVER send internal X-Admin-Api-Key
    expect(req.request.headers.has('X-Admin-Api-Key')).toBe(false);
    req.flush(mockResponse);
  });

  it('should route uploadFiles through backend admin proxy with multipart/form-data', () => {
    const fakeFile = new File(['mock content'], 'test_activities.txt', {
      type: 'text/plain',
    });

    service.uploadFiles([fakeFile], 500, 20).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpTesting.expectOne(`${STORED_KEYS.AI_ADMIN_URL}/files/multi-upload`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    expect(req.request.headers.has('X-Admin-Api-Key')).toBe(false);
    req.flush({ signal: 'multi_upload_success', succeeded: 1 });
  });

  it('should route deleteFile through backend admin proxy without secret leakage', () => {
    service.deleteFile('file_123').subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpTesting.expectOne(
      `${STORED_KEYS.AI_ADMIN_URL}/files/file_123`
    );
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.has('X-Admin-Api-Key')).toBe(false);
    req.flush({ signal: 'file_delete_success' });
  });
});
