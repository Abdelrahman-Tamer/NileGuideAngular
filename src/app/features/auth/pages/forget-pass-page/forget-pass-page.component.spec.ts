import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForgetPassPageComponent } from './forget-pass-page.component';

describe('ForgetPassPageComponent', () => {
  let component: ForgetPassPageComponent;
  let fixture: ComponentFixture<ForgetPassPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgetPassPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForgetPassPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
