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
});
