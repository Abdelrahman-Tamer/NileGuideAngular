import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { interval, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { NATIONALITIES } from '../../../../core/constants/nationalities';

import { Datepicker } from 'flowbite-datepicker';

function passwordsMatch(group: AbstractControl) {
  const p = group.get('password')?.value;
  const c = group.get('confirmPassword')?.value;
  return p === c ? null : { passwordMatch: true };
}

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrls: ['./register-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('dateOfBirthInput')
  dateOfBirthInput?: ElementRef<HTMLInputElement>;

  private dateOfBirthPicker: any;
  private datePickerObserver?: MutationObserver;

  NATIONALITIES = NATIONALITIES;

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  redirectCounter = 3;

  showPassword = false;
  showConfirmPassword = false;

  registerForm = this.fb.group(
    {
      fullName: this.fb.control('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(150),
      ]),
      email: this.fb.control('', [Validators.required, Validators.email]),
      nationality: this.fb.control('', [
        Validators.required,
        Validators.maxLength(100),
      ]),
      dateOfBirth: this.fb.control('', [Validators.required]),
      password: this.fb.control('', [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/),
      ]),
      confirmPassword: this.fb.control('', [
        Validators.required,
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/),
      ]),
      agree: this.fb.control(false, [Validators.requiredTrue]),
    },
    { validators: passwordsMatch }
  );

  ngAfterViewInit(): void {
    this.initDateOfBirthPicker();
  }

  get f() {
    return this.registerForm.controls;
  }

  private initDateOfBirthPicker(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const input = this.dateOfBirthInput?.nativeElement;
    if (!input) return;

    this.dateOfBirthPicker = new Datepicker(input, {
      format: 'yyyy-mm-dd',
      autohide: true,
      clearBtn: true,
      todayBtn: false,
      maxDate: new Date(),
    });

    const syncDateValue = () => {
      const value = input.value;

      this.f.dateOfBirth.setValue(value);
      this.f.dateOfBirth.markAsTouched();
      this.f.dateOfBirth.updateValueAndValidity();

      this.refreshView();
    };

    const styleDatePicker = () => {
      setTimeout(() => this.styleFlowbiteDatePicker(), 0);
    };

    input.addEventListener('changeDate', syncDateValue);
    input.addEventListener('change', syncDateValue);
    input.addEventListener('show', styleDatePicker);
    input.addEventListener('click', styleDatePicker);
    input.addEventListener('focus', styleDatePicker);

    this.startDatePickerObserver();

    this.destroyRef.onDestroy(() => {
      input.removeEventListener('changeDate', syncDateValue);
      input.removeEventListener('change', syncDateValue);
      input.removeEventListener('show', styleDatePicker);
      input.removeEventListener('click', styleDatePicker);
      input.removeEventListener('focus', styleDatePicker);

      this.datePickerObserver?.disconnect();
      this.dateOfBirthPicker?.destroy?.();
    });
  }

  private startDatePickerObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.datePickerObserver = new MutationObserver(() => {
      this.styleFlowbiteDatePicker();
    });

    this.datePickerObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private styleFlowbiteDatePicker(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const input = this.dateOfBirthInput?.nativeElement;
    const picker = document.querySelector('.datepicker-picker');

    if (!picker) return;

    const todayButtons = picker.querySelectorAll('.today-btn');
    todayButtons.forEach((button) => {
      button.classList.add('hidden');
    });

    const clearButtons = picker.querySelectorAll('.clear-btn');

    clearButtons.forEach((button) => {
      const clearButton = button as HTMLButtonElement;

      clearButton.classList.add(
        '!bg-yellow-600',
        'hover:!bg-yellow-400',
        '!text-black',
        '!font-bold',
        '!rounded-xl',
        '!border-yellow-500',
        '!opacity-100',
        'cursor-pointer',
        'm-auto'
      );

      if (!clearButton.dataset['registerClearHandled']) {
        clearButton.dataset['registerClearHandled'] = 'true';

        clearButton.addEventListener('click', () => {
          setTimeout(() => {
            if (input) {
              input.value = '';
            }

            this.f.dateOfBirth.setValue('');
            this.f.dateOfBirth.markAsTouched();
            this.f.dateOfBirth.updateValueAndValidity();

            this.refreshView();
          }, 0);
        });
      }
    });
  }

  openDatePicker(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const input = this.dateOfBirthInput?.nativeElement;
    if (!input) return;

    input.focus();

    try {
      this.dateOfBirthPicker?.show?.();
    } catch {
      input.click();
    }

    setTimeout(() => this.styleFlowbiteDatePicker(), 0);
  }

  blockDateTyping(event: KeyboardEvent): void {
    const allowedKeys = [
      'Tab',
      'Shift',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Enter',
      'Escape',
    ];

    if (!allowedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private refreshView(): void {
    try {
      this.cdr.detectChanges();
    } catch {
      this.cdr.markForCheck();
    }
  }

  submitData(): void {
    if (this.isLoading) return;

    this.registerForm.markAllAsTouched();
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();

    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.refreshView();

    const payload = {
      fullName: this.f.fullName.value!.trim(),
      email: this.f.email.value!.trim(),
      password: this.f.password.value!,
      nationality: this.f.nationality.value!.trim(),
      dateOfBirth: this.f.dateOfBirth.value!,
    };

    this.auth
      .register(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.auth.saveAuth(res.token, res.userId, res.role);

          this.successMessage = 'Account created successfully!';
          this.isLoading = false;
          this.refreshView();

          interval(1000)
            .pipe(take(3), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.redirectCounter--;
              this.refreshView();

              if (this.redirectCounter === 0) {
                this.redirectAfterRegister();
              }
            });
        },
        error: (err: any) => {
          this.errorMessage =
            err?.error?.message ||
            err?.error?.title ||
            'Registration failed. Check inputs and try again.';

          this.isLoading = false;
          this.refreshView();
        },
      });
  }

  private redirectAfterRegister(): void {
    if (this.auth.isAdmin()) {
      this.router.navigateByUrl('/dashboard');
      return;
    }

    this.router.navigateByUrl('/home');
  }
}