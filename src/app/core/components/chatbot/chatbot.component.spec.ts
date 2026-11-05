import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ChatbotComponent } from './chatbot.component';
import { ChatbotService } from './chatbot.service';
import { AuthService } from '../../../features/auth/services/auth.service';

describe('ChatbotComponent', () => {
  let component: ChatbotComponent;
  let fixture: ComponentFixture<ChatbotComponent>;
  let chatbotService: ChatbotService;
  let authService: AuthService;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ChatbotComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr(),
        provideRouter([]),
      ],
    }).compileComponents();

    chatbotService = TestBed.inject(ChatbotService);
    authService = TestBed.inject(AuthService);

    vi.spyOn(chatbotService, 'createGuestSession').mockReturnValue(
      of({
        guest_token: 'mock.token.123',
        guest_id: 'g_1',
        session_id: 's_1',
        daily_limit: 5,
        remaining_questions: 5,
        inactivity_ttl_seconds: 1800,
      })
    );

    fixture = TestBed.createComponent(ChatbotComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should have fallbackImage SVG data URI defined', () => {
    fixture.detectChanges();
    expect(component.fallbackImage).toBeDefined();
    expect(component.fallbackImage).toContain('data:image/svg+xml');
  });

  it('should replace broken image source with fallbackImage on error', () => {
    fixture.detectChanges();
    const mockImg = document.createElement('img');
    mockImg.src = 'https://broken-image.com/fake.jpg';
    const mockEvent = new Event('error');
    Object.defineProperty(mockEvent, 'target', { value: mockImg, writable: false });

    component.onImageError(mockEvent);
    expect(mockImg.src).toContain('data:image/svg+xml');
  });

  it('should render recommended activity cards with Arabic buttons "التفاصيل" and "إضافة للجدول"', () => {
    component.isOpen = true;
    component.messages = [
      {
        sender: 'bot',
        text: 'إليك بعض الأنشطة المقترحة:',
        activities: [
          {
            id: 42,
            title: 'جولة الأهرامات',
            city: 'الجيزة',
            price: '$50',
            imageUrl: 'https://example.com/pyramids.jpg',
          },
        ],
      },
    ];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const allLinks = Array.from(element.querySelectorAll('a'));
    const linkWithDetails = allLinks.find((el) => el.textContent?.includes('التفاصيل'));
    expect(linkWithDetails).toBeTruthy();
    expect(linkWithDetails?.textContent?.trim()).toContain('التفاصيل');

    const allButtons = Array.from(element.querySelectorAll('button'));
    const buttonWithSchedule = allButtons.find((el) => el.textContent?.includes('إضافة للجدول'));
    expect(buttonWithSchedule).toBeTruthy();
    expect(buttonWithSchedule?.textContent?.trim()).toContain('إضافة للجدول');
  });

  it('should apply dir="auto" and text-start to message containers and input', () => {
    component.isOpen = true;
    component.messages = [
      { sender: 'user', text: 'أريد معرفة أرخص الأنشطة' },
      { sender: 'bot', text: 'إليك قائمة الأنشطة في مصر' },
    ];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const messageContainers = element.querySelectorAll('[dir="auto"]');
    expect(messageContainers.length).toBeGreaterThanOrEqual(2);

    const input = element.querySelector('input[name="messageText"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('dir')).toBe('auto');
  });

  it('should safely render markdown formatting in bot messages without exposing raw syntax', () => {
    component.isOpen = true;
    component.messages = [
      {
        sender: 'bot',
        text: '### الأهرامات\nهذا **نشاط رائع** في [مصر](https://example.com)',
      },
    ];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const botBubble = element.querySelector('.markdown-body');
    expect(botBubble).toBeTruthy();
    expect(botBubble?.innerHTML).toContain('<strong class="font-bold text-white">نشاط رائع</strong>');
    expect(botBubble?.innerHTML).toContain('<h4 class="text-sm font-bold text-yellow-400 mt-2.5 mb-1">الأهرامات</h4>');
    expect(botBubble?.innerHTML).toContain('<a href="https://example.com" target="_blank"');
  });

  it('should display guest remaining questions badge for unauthenticated users', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
    component.isGuest = true;
    component.guestToken = 'tok_mock';
    component.guestRemainingQuestions = 3;
    component.guestDailyLimit = 5;
    component.isOpen = true;
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const badge = element.querySelector('[title="الأسئلة المتبقية لليوم"]');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain('3/5 أسئلة');
  });

  it('should show friendly Arabic quota limit notice and disable input when guest limit is reached', () => {
    component.isGuest = true;
    component.guestToken = 'tok_mock';
    component.isGuestLimitReached = true;
    component.guestRemainingQuestions = 0;
    component.isOpen = true;
    component.messages = [{ sender: 'bot', text: 'آخر رد قبل انتهاء الحصة' }];
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const notice = element.textContent;
    expect(notice).toContain('انتهت الأسئلة المتاحة كزائر');
    expect(notice).toContain('وصلت للحد المتاح للمحادثات كزائر');
    expect(notice).toContain('إنشاء حساب مجاني');
    expect(notice).toContain('تسجيل الدخول');

    const input = element.querySelector('input[name="messageText"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);

    const submitBtn = element.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('should show guest temporary session notice in history sidebar for unauthenticated users', () => {
    component.isGuest = true;
    component.guestToken = 'tok_mock';
    component.isOpen = true;
    component.isHistoryOpen = true;
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const historyText = element.textContent;
    expect(historyText).toContain('المحادثات مؤقتة لجلسة الزائر وتُحذف تلقائياً');
    expect(historyText).toContain('إنشاء حساب مجاني');
  });
});
