import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import { LookupItem, UserProfileResponse } from './profile';
import { ProfileService } from './profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  nationalities: string[] = [
    'Egyptian',
    'Saudi Arabian',
    'Emirati',
    'Kuwaiti',
    'Qatari',
    'Bahraini',
    'Omani',
    'Jordanian',
    'Lebanese',
    'Syrian',
    'Palestinian',
    'Iraqi',
    'Moroccan',
    'Tunisian',
    'Algerian',
    'Libyan',
    'Sudanese',
    'American',
    'British',
    'French',
    'German',
    'Italian',
    'Spanish',
    'Canadian',
    'Australian',
    'Indian',
    'Chinese',
    'Japanese',
    'Other'
  ];

  readonly fallbackCities: LookupItem[] = [
    { id: 1, name: 'Cairo' },
    { id: 2, name: 'Luxor' },
    { id: 3, name: 'Aswan' },
    { id: 4, name: 'Sharm El-Sheikh' },
    { id: 5, name: 'Alexandria' },
    { id: 6, name: 'Giza' },
    { id: 7, name: 'Hurghada' },
    { id: 8, name: 'Dahab' }
  ];

  readonly fallbackInterests: LookupItem[] = [
    { id: 1, name: 'History & Culture' },
    { id: 2, name: 'Pyramids' },
    { id: 3, name: 'Local Food' },
    { id: 4, name: 'Nile Cruise' },
    { id: 5, name: 'Red Sea Diving' },
    { id: 6, name: 'Luxury & Relaxation' },
    { id: 7, name: 'Museums' },
    { id: 8, name: 'Adventure' }
  ];

  cities: LookupItem[] = [];
  interestCategories: LookupItem[] = [];

  isLoading = true;
  isSaving = false;
  isUploading = false;

  errorMessage = '';
  successMessage = '';

  profileImageUrl = '/Photo/Aswan.png';

  private currentProfile: UserProfileResponse | null = null;
  private requestId = 0;

  profileForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      dateOfBirth: ['', Validators.required],
      nationality: ['', Validators.required],

      hasTravelDates: [true],
      travelStartDate: [''],
      travelEndDate: [''],

      preferredCityIds: [[] as number[]],
      interestCategoryIds: [[] as number[]]
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadProfilePageData();
  }

  ngOnDestroy(): void {
    this.requestId++;
  }

  loadProfilePageData(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const currentRequestId = ++this.requestId;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    forkJoin({
      profile: this.profileService.getProfile(),
      cities: this.profileService.getCities().pipe(
        catchError(() => of(this.fallbackCities))
      ),
      interests: this.profileService.getInterestCategories().pipe(
        catchError(() => of(this.fallbackInterests))
      )
    }).subscribe({
      next: ({ profile, cities, interests }) => {
        if (currentRequestId !== this.requestId) return;

        this.cities = cities.length ? cities : this.fallbackCities;
        this.interestCategories = interests.length
          ? interests
          : this.fallbackInterests;

        this.setProfileData(profile);

        this.isLoading = false;
        this.errorMessage = '';

        this.cdr.markForCheck();
      },
      error: (error) => {
        if (currentRequestId !== this.requestId) return;

        console.error('Profile loading error:', error);

        this.isLoading = false;
        this.errorMessage = this.extractErrorMessage(
          error,
          'Failed to load profile data.'
        );

        this.cdr.markForCheck();
      }
    });
  }

  setProfileData(profile: UserProfileResponse): void {
    this.currentProfile = profile;

    this.profileImageUrl =
      profile.profile_picture_url ||
      profile.profilePictureUrl ||
      '/Photo/Aswan.png';

    const nationality = profile.nationality || '';

    if (nationality && !this.nationalities.includes(nationality)) {
      this.nationalities = [nationality, ...this.nationalities];
    }

    const hasTravelDates = profile.hasTravelDates ?? false;

    this.profileForm.patchValue({
      fullName: profile.fullName || '',
      email: profile.email || '',
      dateOfBirth: this.toDateOnly(profile.dateOfBirth) || '',
      nationality,

      hasTravelDates,
      travelStartDate: hasTravelDates
        ? this.toDateOnly(profile.travelStartDate) || ''
        : '',
      travelEndDate: hasTravelDates
        ? this.toDateOnly(profile.travelEndDate) || ''
        : '',

      preferredCityIds: profile.preferredCityIds || [],
      interestCategoryIds: profile.interestCategoryIds || []
    });

    this.syncTravelDateControls(hasTravelDates);
    this.cdr.markForCheck();
  }

  saveProfile(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.errorMessage = 'Please complete the required fields.';
      this.cdr.markForCheck();
      return;
    }

    const raw = this.profileForm.getRawValue();

    const hasTravelDates = !!raw.hasTravelDates;
    const travelStartDate = hasTravelDates ? raw.travelStartDate || null : null;
    const travelEndDate = hasTravelDates ? raw.travelEndDate || null : null;

    if (hasTravelDates && (!travelStartDate || !travelEndDate)) {
      this.errorMessage = 'Please select both travel start and end dates.';
      this.cdr.markForCheck();
      return;
    }

    if (
      hasTravelDates &&
      travelStartDate &&
      travelEndDate &&
      new Date(travelEndDate) < new Date(travelStartDate)
    ) {
      this.errorMessage = 'Travel end date cannot be before start date.';
      this.cdr.markForCheck();
      return;
    }

    const payload = {
      fullName: raw.fullName || '',
      email: raw.email || '',
      nationality: raw.nationality || '',
      dateOfBirth: raw.dateOfBirth || null,

      hasTravelDates,
      travelStartDate,
      travelEndDate,

      preferredCityIds: this.toNumberArray(raw.preferredCityIds),
      interestCategoryIds: this.toNumberArray(raw.interestCategoryIds)
    };

    this.isSaving = true;
    this.cdr.markForCheck();

    this.profileService.updateProfile(payload).subscribe({
      next: (updatedProfile) => {
        this.isSaving = false;
        this.successMessage = 'Profile saved successfully.';

        if (updatedProfile && updatedProfile.userId) {
          this.setProfileData(updatedProfile);
        } else if (this.currentProfile) {
          this.setProfileData({
            ...this.currentProfile,
            fullName: payload.fullName,
            email: payload.email,
            nationality: payload.nationality,
            dateOfBirth: payload.dateOfBirth,
            hasTravelDates: payload.hasTravelDates,
            travelStartDate: payload.travelStartDate,
            travelEndDate: payload.travelEndDate,
            preferredCityIds: payload.preferredCityIds,
            interestCategoryIds: payload.interestCategoryIds
          });
        }

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Profile saving error:', error);

        this.isSaving = false;
        this.errorMessage = this.extractErrorMessage(
          error,
          'Failed to save profile.'
        );

        this.cdr.markForCheck();
      }
    });
  }

  onProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please select a valid image file.';
      input.value = '';
      this.cdr.markForCheck();
      return;
    }

    const maxSizeInMb = 5;
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      this.errorMessage = `Image size must be less than ${maxSizeInMb}MB.`;
      input.value = '';
      this.cdr.markForCheck();
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.profileService.uploadProfilePicture(file).subscribe({
      next: (response) => {
        this.isUploading = false;

        const newImageUrl =
          response.profile_picture_url ||
          response.profilePictureUrl ||
          response.imageUrl ||
          response.url;

        if (newImageUrl) {
          this.profileImageUrl = newImageUrl;
        } else {
          this.loadProfilePageData();
        }

        this.successMessage = 'Profile picture updated successfully.';
        input.value = '';

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Profile picture upload error:', error);

        this.isUploading = false;
        this.errorMessage = this.extractErrorMessage(
          error,
          'Failed to upload profile picture.'
        );

        input.value = '';
        this.cdr.markForCheck();
      }
    });
  }

  openDatePicker(input: HTMLInputElement): void {
    if (!input) {
      return;
    }

    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    try {
      if (typeof pickerInput.showPicker === 'function') {
        pickerInput.showPicker();
        return;
      }
    } catch {
      // Fallback for browsers that block showPicker in specific cases.
    }

    input.focus();
    input.click();
  }

  openTravelDatePicker(input: HTMLInputElement): void {
    if (!this.profileForm.value.hasTravelDates) {
      this.profileForm.patchValue({
        hasTravelDates: true
      });

      this.syncTravelDateControls(true);
      this.cdr.markForCheck();

      setTimeout(() => {
        this.openDatePicker(input);
      }, 0);

      return;
    }

    this.openDatePicker(input);
  }

  preventDateTyping(event: KeyboardEvent): void {
    event.preventDefault();
  }

  formatDateForDisplay(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const dateOnly = value.split('T')[0];
    const parts = dateOnly.split('-');

    if (parts.length !== 3) {
      return value;
    }

    const [year, month, day] = parts;
    return `${month}/${day}/${year}`;
  }

  toggleHasTravelDates(): void {
    const currentValue = !!this.profileForm.value.hasTravelDates;
    const nextValue = !currentValue;

    this.profileForm.patchValue({
      hasTravelDates: nextValue
    });

    if (!nextValue) {
      this.profileForm.patchValue({
        travelStartDate: '',
        travelEndDate: ''
      });
    }

    this.syncTravelDateControls(nextValue);
    this.cdr.markForCheck();
  }

  toggleArrayValue(
    controlName: 'preferredCityIds' | 'interestCategoryIds',
    id: number
  ): void {
    const currentValue = this.toNumberArray(
      this.profileForm.get(controlName)?.value
    );

    const updatedValue = currentValue.includes(id)
      ? currentValue.filter((itemId) => itemId !== id)
      : [...currentValue, id];

    this.profileForm.patchValue({
      [controlName]: updatedValue
    });

    this.cdr.markForCheck();
  }

  isSelected(
    controlName: 'preferredCityIds' | 'interestCategoryIds',
    id: number
  ): boolean {
    const currentValue = this.toNumberArray(
      this.profileForm.get(controlName)?.value
    );

    return currentValue.includes(id);
  }

  trackById(index: number, item: LookupItem): number {
    return item.id;
  }

  get fullNameInvalid(): boolean {
    const control = this.profileForm.get('fullName');
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  get emailInvalid(): boolean {
    const control = this.profileForm.get('email');
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  get dateOfBirthInvalid(): boolean {
    const control = this.profileForm.get('dateOfBirth');
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  get nationalityInvalid(): boolean {
    const control = this.profileForm.get('nationality');
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private syncTravelDateControls(hasTravelDates: boolean): void {
    const startControl = this.profileForm.get('travelStartDate');
    const endControl = this.profileForm.get('travelEndDate');

    startControl?.enable({ emitEvent: false });
    endControl?.enable({ emitEvent: false });
  }

  private toDateOnly(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    return value.split('T')[0];
  }

  private toNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => Number(item))
      .filter((item) => !Number.isNaN(item));
  }

  private extractErrorMessage(error: any, fallbackMessage: string): string {
    const status = error?.status;
    const url = error?.url;

    if (status === 0) {
      return `Cannot connect to the API. URL: ${url}`;
    }

    if (status === 401) {
      return 'Unauthorized. Please login again or check that the token is being sent.';
    }

    if (status === 403) {
      return 'Forbidden. Your account does not have permission to access this profile.';
    }

    if (status === 404) {
      return `Profile endpoint was not found. Wrong URL: ${url}`;
    }

    if (typeof error?.error === 'string') {
      return `${fallbackMessage} ${error.error}`;
    }

    if (error?.error?.message) {
      return `${fallbackMessage} ${error.error.message}`;
    }

    if (error?.error?.title) {
      return `${fallbackMessage} ${error.error.title}`;
    }

    if (status) {
      return `${fallbackMessage} Status code: ${status}. URL: ${url}`;
    }

    return fallbackMessage;
  }
}