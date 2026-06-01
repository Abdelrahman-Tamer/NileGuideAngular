import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

function passwordsMatch(group: AbstractControl) {
  const p = group.get('newPassword')?.value;
  const c = group.get('confirmNewPassword')?.value;
  return p === c ? null : { passwordMatch: true };
}

@Component({
  selector: 'ResetPasswordComponent ',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
   templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent  {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = false;
  successMessage = '';
  errorMessage = '';
  showNew = false;
  showConfirm = false;

  form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email, Validators.maxLength(150)]),
    code: this.fb.control('', [
      Validators.required,
      Validators.pattern(/^\d{6}$/), // 6 digits
    ]),
    newPassword: this.fb.control('', [
      Validators.required,
      Validators.maxLength(100),
      Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/), // same as register
    ]),
    confirmNewPassword: this.fb.control('', [Validators.required]),
  }, { validators: passwordsMatch });

  get f() { return this.form.controls; }

  toggleNew() { this.showNew = !this.showNew; this.cdr.markForCheck(); }
  toggleConfirm() { this.showConfirm = !this.showConfirm; this.cdr.markForCheck(); }

  submit(): void {
    if (this.isLoading) return;

    this.form.markAllAsTouched();
    this.successMessage = '';
    this.errorMessage = '';
    if (this.form.invalid) {
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;

    const payload = {
      email: this.f.email.value!.trim(),
      code: this.f.code.value!,
      newPassword: this.f.newPassword.value!,
    };

    this.auth.resetPassword(payload)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: () => {
          this.successMessage = 'Password reset successfully!';
          this.cdr.markForCheck();
      
          this.router.navigateByUrl('/auth/login');
        },
        error: (e: HttpErrorResponse) => {
          this.errorMessage =
            (e.status === 400 ? ((e.error as any)?.message || 'Validation error') :
            (e.status === 404 ? ((e.error as any)?.message || 'Code not found') :
            (e.status === 409 ? ((e.error as any)?.message || 'Conflict') :
            ((e.error as any)?.message || 'Something went wrong'))));
          this.cdr.markForCheck();
        },
      });
  }
}