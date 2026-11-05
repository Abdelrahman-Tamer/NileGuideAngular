import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';

import { ForgetPassPageComponent } from './forget-pass-page.component';

describe('ForgetPassPageComponent', () => {
  let component: ForgetPassPageComponent;
  let fixture: ComponentFixture<ForgetPassPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgetPassPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgetPassPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
