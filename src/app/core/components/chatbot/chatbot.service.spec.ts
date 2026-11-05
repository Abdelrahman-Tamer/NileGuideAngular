import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { STORED_KEYS } from '../../constants/Stored_keys';
import {
  ChatbotService,
  ChatResponse,
  GuestSessionResponse,
  RetrievedConversationResponse,
} from './chatbot.service';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChatbotService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create an AI conversation for authenticated users', () => {
    service.createAiConversation().subscribe((res) => {
      expect(res.conversation_id).toBe('conv_123');
    });

    const req = httpTesting.expectOne(`${STORED_KEYS.AI_BASE_URL}/conversation`);
    expect(req.request.method).toBe('POST');
    req.flush({ conversation_id: 'conv_123' });
  });

  it('should create a guest session with token and quotas', () => {
    const mockGuest: GuestSessionResponse = {
      guest_token: 'g_123.s_456.1700000000.signature',
      guest_id: 'g_123',
      session_id: 's_456',
      daily_limit: 5,
      remaining_questions: 5,
      inactivity_ttl_seconds: 1800,
    };

    service.createGuestSession().subscribe((res) => {
      expect(res.guest_token).toBe(mockGuest.guest_token);
      expect(res.remaining_questions).toBe(5);
      expect(res.daily_limit).toBe(5);
    });

    const req = httpTesting.expectOne(`${STORED_KEYS.AI_BASE_URL}/guest/session`);
    expect(req.request.method).toBe('POST');
    req.flush(mockGuest);
  });

  it('should manage guest session storage in sessionStorage', () => {
    expect(service.getStoredGuestSession()).toBeNull();

    const mockSession: GuestSessionResponse = {
      guest_token: 'tok_abc',
      guest_id: 'gid_1',
      session_id: 'sid_1',
      daily_limit: 5,
      remaining_questions: 3,
      inactivity_ttl_seconds: 1800,
    };

    service.storeGuestSession(mockSession);
    const retrieved = service.getStoredGuestSession();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.guest_token).toBe('tok_abc');
    expect(retrieved?.remaining_questions).toBe(3);

    service.clearGuestSession();
    expect(service.getStoredGuestSession()).toBeNull();
  });

  it('should send message to AI chat endpoint with guest token', () => {
    const mockChatResponse: ChatResponse = {
      signal: 'chat_success',
      message: 'Here are activities in Cairo',
      answer: 'Here are activities in Cairo',
      guest_remaining_questions: 4,
      guest_daily_limit: 5,
      sources: [
        {
          activity_id: 85,
          title: 'Cairo night tour',
          city: 'Cairo',
          price: '40.5 USD',
          image_url: 'https://cloudinary.com/img.jpg',
          link: 'https://nileguide.online/activities/85',
        },
      ],
    };

    service.sendMessage('Cairo activities', undefined, 'tok_guest_xyz').subscribe((res) => {
      expect(res.answer).toBe('Here are activities in Cairo');
      expect(res.guest_remaining_questions).toBe(4);
      expect(res.sources?.length).toBe(1);
    });

    const req = httpTesting.expectOne(`${STORED_KEYS.AI_BASE_URL}/chat`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      text: 'Cairo activities',
      limit: 5,
      guest_token: 'tok_guest_xyz',
    });
    req.flush(mockChatResponse);
  });

  it('should retrieve conversation history with sources', () => {
    const mockRetrieved: RetrievedConversationResponse = {
      conversation_id: 'conv_123',
      history: [
        { role: 'user', content: 'Cairo' },
        {
          role: 'assistant',
          content: 'Here are top places:',
          sources: [
            {
              activity_id: 85,
              title: 'Cairo night tour',
              price: '40.5 USD',
            },
          ],
        },
      ],
    };

    service.retrieveConversation('conv_123').subscribe((res) => {
      expect(res.conversation_id).toBe('conv_123');
      expect(res.history.length).toBe(2);
      expect(res.history[1].sources?.[0].activity_id).toBe(85);
    });

    const req = httpTesting.expectOne(
      `${STORED_KEYS.AI_BASE_URL}/conversation/conv_123`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockRetrieved);
  });
});
