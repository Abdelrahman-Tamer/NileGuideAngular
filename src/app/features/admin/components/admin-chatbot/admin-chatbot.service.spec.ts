import { TestBed } from '@angular/core/testing';

import { AdminChatbotService } from './admin-chatbot.service';

describe('AdminChatbotService', () => {
  let service: AdminChatbotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminChatbotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
