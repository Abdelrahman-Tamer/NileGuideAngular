
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-pass',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forget-pass-page.component.html',
  styleUrl: './forget-pass-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush, 
})
export class ForgetPassPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private navigateTimer: any;

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    email: this.fb.control('', [
      Validators.required,
      Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/),
    ]),
  });

  get f() {
    return this.form.controls;
  }

  private refresh(): void {
    try {
      this.cdr.detectChanges();
    } catch {
      this.cdr.markForCheck();
    }
  }

  submit(): void {
    if (this.isLoading) return;

    this.form.markAllAsTouched();
    this.errorMessage = '';
    this.successMessage = '';
    this.refresh();

    if (this.form.invalid) return;

    this.isLoading = true;
    this.refresh();

    const email = this.f.email.value!.trim();

   this.auth
  .forgotPassword(email)
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe({
    next: () => {
      this.successMessage = 'If the email exists, a reset code was sent.';
      this.isLoading = false;

      localStorage.setItem('reset_email', email);

      this.refresh(); 

       clearTimeout(this.navigateTimer);
        queueMicrotask(() => {       
          this.refresh();
          this.navigateTimer = setTimeout(() => {
            if (!this.successMessage) return;
            this.router.navigateByUrl('/auth/reset-password');
          }, 3000);
        });
        
    },
    error: (e: HttpErrorResponse) => {
      this.isLoading = false;
      this.errorMessage =
        e.status === 400 ? ((e.error as any)?.message || 'Invalid email format') :
        ((e.error as any)?.message || 'Something went wrong');

      this.refresh();
    },
  });
  }
}