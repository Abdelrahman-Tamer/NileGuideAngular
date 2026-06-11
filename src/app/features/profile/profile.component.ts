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
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { LookupItem, UserProfileResponse } from './profile';
import { ProfileService } from './profile.service';
import { NATIONALITIES } from '../../core/constants/nationalities';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  nationalities: string[] = [...NATIONALITIES];

  cities: LookupItem[] = [];
  interestCategories: LookupItem[] = [];

  isLoading = true;
  isSaving = false;
  isUploading = false;

  isDeletingProfilePicture = false;
  isDeleteProfilePictureModalOpen = false;

  errorMessage = '';
  successMessage = '';

  profileImageUrl = '';

  showTravelDates = false;

  private currentProfile: UserProfileResponse | null = null;
  private requestId = 0;

  profileForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      dateOfBirth: ['', Validators.required],
      nationality: ['', Validators.required],

      hasTravelDates: [false],
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

    let lookupLoadFailed = false;

    forkJoin({
      profile: this.profileService.getProfile(),
      cities: this.profileService.getCities().pipe(
        catchError((error) => {
          console.error('Cities loading error:', error);
          lookupLoadFailed = true;
          return of([] as LookupItem[]);
        })
      ),
      interests: this.profileService.getInterestCategories().pipe(
        catchError((error) => {
          console.error('Interest categories loading error:', error);
          lookupLoadFailed = true;
          return of([] as LookupItem[]);
        })
      )
    }).subscribe({
      next: ({ profile, cities, interests }) => {
        if (currentRequestId !== this.requestId) return;

        this.cities = cities;
        this.interestCategories = interests;

        this.setProfileData(profile);

        this.isLoading = false;
        this.errorMessage = lookupLoadFailed
          ? 'Failed to load cities or categories. Please refresh and try again.'
          : '';

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

    this.profileImageUrl = this.getProfilePictureUrlFromProfile(profile);

    const nationality = profile.nationality || '';

    if (nationality && !this.nationalities.includes(nationality)) {
      this.nationalities = [nationality, ...this.nationalities];
    }

    const hasTravelDates = !!profile.hasTravelDates;
    this.showTravelDates = hasTravelDates;

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

    const hasTravelDates = this.showTravelDates;
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

        this.goToActivitiesWithProfileFilters(
          payload.preferredCityIds,
          payload.interestCategoryIds
        );
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

  addTravelDates(): void {
    this.showTravelDates = true;

    this.profileForm.patchValue({
      hasTravelDates: true
    });

    this.syncTravelDateControls(true);
    this.cdr.markForCheck();
  }

  removeTravelDates(): void {
    this.showTravelDates = false;

    this.profileForm.patchValue({
      hasTravelDates: false,
      travelStartDate: '',
      travelEndDate: ''
    });

    this.syncTravelDateControls(false);
    this.cdr.markForCheck();
  }

  toggleHasTravelDates(): void {
    if (this.showTravelDates) {
      this.removeTravelDates();
      return;
    }

    this.addTravelDates();
  }

  onProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Please select JPG or PNG image only.';
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

        const newImageUrl = this.getProfilePictureUrlFromUploadResponse(response);

        if (newImageUrl) {
          this.profileImageUrl = this.addCacheBuster(newImageUrl);

          if (this.currentProfile) {
            this.currentProfile = {
              ...this.currentProfile,
              profile_picture_url: newImageUrl,
              profilePictureUrl: newImageUrl
            };
          }
        } else {
          this.refreshProfileAfterPictureUpload();
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

  onProfileImageError(): void {
    this.profileImageUrl = '';
    this.cdr.markForCheck();
  }

  openDeleteProfilePictureModal(event?: Event): void {
    event?.stopPropagation();

    if (!this.profileImageUrl || this.isUploading || this.isDeletingProfilePicture) {
      return;
    }

    this.isDeleteProfilePictureModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();
  }

  closeDeleteProfilePictureModal(): void {
    if (this.isDeletingProfilePicture) {
      return;
    }

    this.isDeleteProfilePictureModalOpen = false;
    this.cdr.markForCheck();
  }

  confirmDeleteProfilePicture(): void {
    if (!this.profileImageUrl) {
      return;
    }

    this.isDeletingProfilePicture = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.profileService.deleteProfilePicture().subscribe({
      next: () => {
        this.isDeletingProfilePicture = false;
        this.isDeleteProfilePictureModalOpen = false;
        this.profileImageUrl = '';

        if (this.currentProfile) {
          this.currentProfile = {
            ...this.currentProfile,
            profile_picture_url: null,
            profilePictureUrl: null
          };
        }

        this.successMessage = 'Profile picture deleted successfully.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Profile picture delete error:', error);

        this.isDeletingProfilePicture = false;
        this.isDeleteProfilePictureModalOpen = false;

        this.errorMessage = this.extractErrorMessage(
          error,
          'Failed to delete profile picture.'
        );

        this.cdr.markForCheck();
      }
    });
  }

  get profileInitials(): string {
    const fullName =
      this.profileForm.get('fullName')?.value ||
      this.currentProfile?.fullName ||
      '';

    const nameParts = String(fullName)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }

    if (nameParts.length === 1) {
      return nameParts[0][0].toUpperCase();
    }

    const email =
      this.profileForm.get('email')?.value ||
      this.currentProfile?.email ||
      '';

    if (email) {
      return String(email)[0].toUpperCase();
    }

    return 'U';
  }

  openDatePicker(input: HTMLInputElement): void {
    if (!input) return;

    input.focus();

    const dateInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    try {
      dateInput.showPicker?.();
    } catch {
      input.focus();
    }
  }

  openTravelDatePicker(input: HTMLInputElement): void {
    if (!this.showTravelDates) {
      this.addTravelDates();

      setTimeout(() => {
        this.openDatePicker(input);
      }, 0);

      return;
    }

    this.openDatePicker(input);
  }

  preventDateTyping(event: KeyboardEvent): void {
    this.blockDateTyping(event);
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
      'Escape'
    ];

    if (!allowedKeys.includes(event.key)) {
      event.preventDefault();
    }
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

  private goToActivitiesWithProfileFilters(
    preferredCityIds: number[],
    interestCategoryIds: number[]
  ): void {
    const queryParams: {
      cities?: string;
      categories?: string;
    } = {};

    if (preferredCityIds.length > 0) {
      queryParams.cities = preferredCityIds.join(',');
    }

    if (interestCategoryIds.length > 0) {
      queryParams.categories = interestCategoryIds.join(',');
    }

    this.router.navigate(['/activities'], {
      queryParams
    });
  }

  private refreshProfileAfterPictureUpload(): void {
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.setProfileData(profile);
        this.profileImageUrl = this.addCacheBuster(this.profileImageUrl);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Profile refresh after picture upload error:', error);
        this.cdr.markForCheck();
      }
    });
  }

  private getProfilePictureUrlFromProfile(profile: UserProfileResponse): string {
    const imageUrl =
      profile.profile_picture_url ||
      profile.profilePictureUrl ||
      '';

    return this.profileService.resolveFileUrl(imageUrl);
  }

  private getProfilePictureUrlFromUploadResponse(response: any): string {
    const imageUrl =
      response?.profile_picture_url ||
      response?.profilePictureUrl ||
      '';

    return this.profileService.resolveFileUrl(imageUrl);
  }

  private addCacheBuster(url: string): string {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  }

  private syncTravelDateControls(hasTravelDates: boolean): void {
    const startControl = this.profileForm.get('travelStartDate');
    const endControl = this.profileForm.get('travelEndDate');

    if (hasTravelDates) {
      startControl?.setValidators([Validators.required]);
      endControl?.setValidators([Validators.required]);
    } else {
      startControl?.clearValidators();
      endControl?.clearValidators();
    }

    startControl?.updateValueAndValidity({ emitEvent: false });
    endControl?.updateValueAndValidity({ emitEvent: false });
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