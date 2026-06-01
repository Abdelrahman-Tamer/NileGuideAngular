import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
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
import { STORED_KEYS } from '../../../../core/constants/Stored_keys';

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
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  NATIONALITIES = NATIONALITIES;

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  redirectCounter = 3;
   showPassword = false;

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

  get f() {
    return this.registerForm.controls;
  }

showConfirmPassword = false;

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
    };

    this.auth
      .register(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          localStorage.setItem(STORED_KEYS.USER_TOKEN, res.token);
          if (res.userId !== undefined && res.userId !== null) {
            localStorage.setItem(STORED_KEYS.USER_ID, String(res.userId));
          }

          this.successMessage = 'Account created successfully!';
          this.isLoading = false;
          this.refreshView();

          interval(1000)
            .pipe(take(3), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.redirectCounter--;
              this.refreshView();

              if (this.redirectCounter === 0) {
                this.router.navigateByUrl('/home');
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
}