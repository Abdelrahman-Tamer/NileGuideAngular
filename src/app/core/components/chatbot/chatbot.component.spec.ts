import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';
import { provideRouter } from '@angular/router';

import { ChatbotComponent } from './chatbot.component';

describe('ChatbotComponent', () => {
  let component: ChatbotComponent;
  let fixture: ComponentFixture<ChatbotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatbotComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatbotComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have fallbackImage SVG data URI defined', () => {
    expect(component.fallbackImage).toBeDefined();
    expect(component.fallbackImage).toContain('data:image/svg+xml');
  });

  it('should replace broken image source with fallbackImage on error', () => {
    const mockImg = document.createElement('img');
    mockImg.src = 'https://broken-image.com/fake.jpg';
    const mockEvent = new Event('error');
    Object.defineProperty(mockEvent, 'target', { value: mockImg, writable: false });

    component.onImageError(mockEvent);
    expect(mockImg.src).toContain('data:image/svg+xml');
  });

  it('should render recommended activity cards with Arabic buttons "التفاصيل" and "إضافة للجدول"', () => {
    vi.spyOn(component as any, 'loadSavedConversations').mockImplementation(() => {});
    component.toggleChat();
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
    (component as any).cdr.detectChanges();

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
});
