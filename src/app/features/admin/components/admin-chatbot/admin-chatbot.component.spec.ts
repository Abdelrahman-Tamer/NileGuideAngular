import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminChatbotComponent } from './admin-chatbot.component';

describe('AdminChatbotComponent', () => {
  let component: AdminChatbotComponent;
  let fixture: ComponentFixture<AdminChatbotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminChatbotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminChatbotComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
