import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { STORED_KEYS } from '../../constants/Stored_keys';
import { ChatbotService, ChatResponse, RetrievedConversationResponse } from './chatbot.service';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChatbotService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create an AI conversation', () => {
    service.createAiConversation().subscribe((res) => {
      expect(res.conversation_id).toBe('conv_123');
    });

    const req = httpTesting.expectOne(`${STORED_KEYS.AI_BASE_URL}/conversation`);
    expect(req.request.method).toBe('POST');
    req.flush({ conversation_id: 'conv_123' });
  });

  it('should send message to AI chat endpoint', () => {
    const mockChatResponse: ChatResponse = {
      signal: 'chat_success',
      message: 'Here are activities in Cairo',
      answer: 'Here are activities in Cairo',
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

    service.sendMessage('Cairo activities', 'conv_123').subscribe((res) => {
      expect(res.answer).toBe('Here are activities in Cairo');
      expect(res.sources?.length).toBe(1);
      expect(res.sources?.[0].activity_id).toBe(85);
    });

    const req = httpTesting.expectOne(`${STORED_KEYS.AI_BASE_URL}/chat`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      text: 'Cairo activities',
      limit: 5,
      conversation_id: 'conv_123',
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
