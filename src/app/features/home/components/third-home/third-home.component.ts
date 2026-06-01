import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { STORED_KEYS } from '../../../../core/constants/Stored_keys';

@Component({
  selector: 'app-third-home',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './third-home.component.html',
  styleUrl: './third-home.component.css',
})
export class ThirdHomeComponent {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  email: string = '';
  successMessage: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  showSuccessMessage = false;
  showErrorMessage = false;

  subscribe(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.showSuccessMessage = false;
    this.showErrorMessage = false;

    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your email.';
      this.showErrorMessage = true;
      this.cdr.detectChanges();
      this.clearMessagesWithAnimation();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.http
      .post(
        `${STORED_KEYS.baseUrl}/newsletter/subscribe`,
        { email: this.email.trim() }
      )
      .subscribe({
        next: (res: any) => {
          this.successMessage =
            res?.message ||
            res?.title ||
            res?.data?.message ||
            'Success';

          this.errorMessage = '';
          this.email = '';
          this.isLoading = false;

          this.showSuccessMessage = true;
          this.showErrorMessage = false;

          this.cdr.detectChanges();
          this.clearMessagesWithAnimation();
        },
        error: (err: any) => {
          this.successMessage = '';
          this.errorMessage =
            err?.error?.message ||
            err?.error?.title ||
            err?.error?.errors?.[0] ||
            err?.message ||
            'Something went wrong';

          this.isLoading = false;

          this.showSuccessMessage = false;
          this.showErrorMessage = true;

          this.cdr.detectChanges();
          this.clearMessagesWithAnimation();
        },
      });
  }

  clearMessagesWithAnimation(): void {
    setTimeout(() => {
      this.showSuccessMessage = false;
      this.showErrorMessage = false;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.successMessage = '';
        this.errorMessage = '';
        this.cdr.detectChanges();
      }, 300);
    }, 5000);
  }
}