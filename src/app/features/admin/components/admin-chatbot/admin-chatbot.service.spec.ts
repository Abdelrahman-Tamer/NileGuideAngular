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

  it('should fetch files list from verified AI data URL', () => {
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

    const req = httpTesting.expectOne(`${STORED_KEYS.AI_DATA_URL}/files`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should upload files using multipart/form-data to /multi-upload', () => {
    const fakeFile = new File(['mock content'], 'test_activities.txt', {
      type: 'text/plain',
    });

    service.uploadFiles([fakeFile], 500, 20).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpTesting.expectOne(`${STORED_KEYS.AI_DATA_URL}/multi-upload`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ signal: 'multi_upload_success', succeeded: 1 });
  });

  it('should delete a file by file_id', () => {
    service.deleteFile('file_123').subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpTesting.expectOne(
      `${STORED_KEYS.AI_DATA_URL}/file/file_123`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush({ signal: 'file_delete_success' });
  });
});
