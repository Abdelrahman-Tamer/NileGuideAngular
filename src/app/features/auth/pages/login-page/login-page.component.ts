import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { interval, take } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css'],
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  redirectCounter = 3;

  loginForm = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    remember: this.fb.control(false),
  });

  get f() {
    return this.loginForm.controls;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  submitData(): void {
    if (this.isLoading) return;

    this.loginForm.markAllAsTouched();
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.cdr.markForCheck();

    const payload = {
      email: this.f.email.value!.trim(),
      password: this.f.password.value!,
    };

    this.auth.login(payload).subscribe({
      next: (res) => {
        this.auth.saveAuth(res.token, res.userId);

        this.successMessage = 'Logged in successfully!';
        this.isLoading = false;
        this.cdr.markForCheck();

        interval(1000).pipe(take(3)).subscribe(() => {
          --this.redirectCounter;
          this.cdr.markForCheck();
          if (this.redirectCounter === 0) {
            this.router.navigateByUrl('/home');
          }
        });
      },
   error: (e: HttpErrorResponse) => {
  if (e.status === 401) {
    this.errorMessage = 'Invalid Email or Password'; } 
   else {
    this.errorMessage =
      (e.error as any)?.message ||
      (e.error as any)?.title ||
      e.message ||
      'Something went wrong'; }
  this.isLoading = false;
  this.cdr.markForCheck(); 
},
    });
  }
}