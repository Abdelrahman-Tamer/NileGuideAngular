import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr(),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have default layout state flags defined', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.showNavbar).toBeDefined();
    expect(app.showFooter).toBeDefined();
    expect(app.showChatbot).toBeDefined();
  });

  it('should display chatbot for unauthenticated guest users on public pages', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    (app as any).updateLayoutState('/');
    expect(app.showChatbot).toBe(true);
  });

  it('should hide chatbot on auth and dashboard pages', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    (app as any).updateLayoutState('/auth/login');
    expect(app.showChatbot).toBe(false);

    (app as any).updateLayoutState('/dashboard');
    expect(app.showChatbot).toBe(false);
  });
});
