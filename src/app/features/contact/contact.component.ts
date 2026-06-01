import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import emailjs, { EmailJSResponseStatus } 
from '@emailjs/browser';

import { EMAILJS_CONFIG, isEmailJsConfigReady } from './emailjs.config';

type SubmissionState = 'idle' | 'loading' | 'success' | 'error';

type ContactForm = FormGroup<{
  name: FormControl<string>;
  email: FormControl<string>;
  subject: FormControl<string>;
  message: FormControl<string>;
}>;

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent implements OnInit, OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);
  private feedbackTimeoutId?: number;

  readonly contactForm: ContactForm = this.fb.group({
    name: this.fb.control('', Validators.required),
    email: this.fb.control('', [Validators.required, Validators.email]),
    subject: this.fb.control('', Validators.required),
    message: this.fb.control('', Validators.required)
  });

  submissionState: SubmissionState = 'idle';
  feedbackMessage = '';

  get controls() {
    return this.contactForm.controls;
  }

  get isLoading(): boolean {
    return this.submissionState === 'loading';
  }

  get isSuccess(): boolean {
    return this.submissionState === 'success';
  }

  get isError(): boolean {
    return this.submissionState === 'error';
  }

  ngOnInit(): void {
    this.initializeEmailJs();
  }

  ngOnDestroy(): void {
    this.clearFeedbackTimeout();
  }

  hasError(controlName: keyof ContactForm['controls'], errorCode?: string): boolean {
    const control = this.contactForm.controls[controlName];

    if (!(control.invalid && (control.touched || control.dirty))) {
      return false;
    }

    return errorCode ? control.hasError(errorCode) : true;
  }

  async onSubmit(): Promise<void> {
    this.contactForm.markAllAsTouched();

    if (this.contactForm.invalid) {
      return;
    }

    if (!isEmailJsConfigReady(EMAILJS_CONFIG)) {
      this.showStatus(
        'error',
        'Configure EmailJS in emailjs.config.ts before sending messages.',
        7000
      );
      return;
    }

    this.clearFeedbackTimeout();
    this.submissionState = 'loading';
    this.feedbackMessage = '';

    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        this.buildTemplateParams()
      );

      this.contactForm.reset({
        name: '',
        email: '',
        subject: '',
        message: ''
      });

      this.showStatus('success', 'Your message has been sent successfully.');
    } catch (error: unknown) {
      this.showStatus('error', this.getErrorMessage(error), 7000);
    }
  }

  private initializeEmailJs(): void {
    if (!EMAILJS_CONFIG.publicKey || EMAILJS_CONFIG.publicKey.startsWith('YOUR_')) {
      return;
    }

    emailjs.init({
      publicKey: EMAILJS_CONFIG.publicKey,
      limitRate: {
        id: 'contact-form',
        throttle: 10000
      }
    });
  }

  private buildTemplateParams(): Record<string, string> {
    const { name, email, subject, message } = this.contactForm.getRawValue();

    return {
      from_name: name,
      from_email: email,
      reply_to: email,
      subject,
      message
    };
  }

  private showStatus(
    state: Exclude<SubmissionState, 'idle' | 'loading'>,
    message: string,
    timeoutMs = 5000
  ): void {
    this.submissionState = state;
    this.feedbackMessage = message;
    this.scheduleFeedbackReset(timeoutMs);
  }

  private scheduleFeedbackReset(timeoutMs: number): void {
    this.clearFeedbackTimeout();
    this.feedbackTimeoutId = window.setTimeout(() => {
      if (this.submissionState === 'loading') {
        return;
      }

      this.submissionState = 'idle';
      this.feedbackMessage = '';
    }, timeoutMs);
  }

  private clearFeedbackTimeout(): void {
    if (this.feedbackTimeoutId === undefined) {
      return;
    }

    window.clearTimeout(this.feedbackTimeoutId);
    this.feedbackTimeoutId = undefined;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof EmailJSResponseStatus) {
      return `EmailJS request failed (${error.status}). Verify your service ID, template ID, and template variables.`;
    }

    return 'Unable to send your message right now. Please try again in a moment.';
  }
}