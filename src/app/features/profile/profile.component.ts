import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild
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

// لو السطر ده عمل import error عندك، استخدم بداله:
// import Datepicker from 'flowbite-datepicker/Datepicker';
// import DateRangePicker from 'flowbite-datepicker/DateRangePicker';
import { Datepicker, DateRangePicker } from 'flowbite-datepicker';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('dateOfBirthInput')
  dateOfBirthInput?: ElementRef<HTMLInputElement>;

  @ViewChild('travelDateRangePicker')
  travelDateRangePicker?: ElementRef<HTMLDivElement>;

  @ViewChild('travelStartDateInput')
  travelStartDateInput?: ElementRef<HTMLInputElement>;

  @ViewChild('travelEndDateInput')
  travelEndDateInput?: ElementRef<HTMLInputElement>;

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

  private dateOfBirthPicker: any;
  private travelDateRangePickerInstance: any;
  private datePickerObserver?: MutationObserver;

  private dateOfBirthEventsBound = false;
  private travelDateEventsBound = false;

  private readonly syncDateOfBirthHandler = () => this.syncDateOfBirthValue();
  private readonly syncTravelDatesHandler = () => this.syncTravelDateValues();
  private readonly styleDatePickerHandler = () => {
    setTimeout(() => this.styleFlowbiteDatePickers(), 0);
  };

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

  ngAfterViewInit(): void {
    this.initDatePickersAfterRender();
  }

  ngOnDestroy(): void {
    this.requestId++;
    this.destroyDatePickers();
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

        this.refreshView();
        this.initDatePickersAfterRender();
      },
      error: (error) => {
        if (currentRequestId !== this.requestId) return;

        console.error('Profile loading error:', error);

        this.isLoading = false;
        this.errorMessage = this.extractErrorMessage(
          error,
          'Failed to load profile data.'
        );

        this.refreshView();
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
    this.refreshView();
    this.initDatePickersAfterRender();
  }

  saveProfile(): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.syncAllDateValues();

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.errorMessage = 'Please complete the required fields.';
      this.refreshView();
      return;
    }

    const raw = this.profileForm.getRawValue();

    const hasTravelDates = this.showTravelDates;
    const travelStartDate = hasTravelDates ? raw.travelStartDate || null : null;
    const travelEndDate = hasTravelDates ? raw.travelEndDate || null : null;

    if (hasTravelDates && (!travelStartDate || !travelEndDate)) {
      this.errorMessage = 'Please select both travel start and end dates.';
      this.refreshView();
      return;
    }

    if (
      hasTravelDates &&
      travelStartDate &&
      travelEndDate &&
      new Date(travelEndDate) < new Date(travelStartDate)
    ) {
      this.errorMessage = 'Travel end date cannot be before start date.';
      this.refreshView();
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
    this.refreshView();

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

        this.refreshView();
      }
    });
  }

  addTravelDates(): void {
    this.showTravelDates = true;

    this.profileForm.patchValue({
      hasTravelDates: true
    });

    this.syncTravelDateControls(true);
    this.refreshView();
    this.initDatePickersAfterRender();
  }

  removeTravelDates(): void {
    this.destroyTravelDateRangePicker();

    this.showTravelDates = false;

    this.profileForm.patchValue({
      hasTravelDates: false,
      travelStartDate: '',
      travelEndDate: ''
    });

    this.syncTravelDateControls(false);
    this.refreshView();
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
      this.refreshView();
      return;
    }

    const maxSizeInMb = 5;
    const maxSizeInBytes = maxSizeInMb * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      this.errorMessage = `Image size must be less than ${maxSizeInMb}MB.`;
      input.value = '';
      this.refreshView();
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();

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

        this.refreshView();
      },
      error: (error) => {
        console.error('Profile picture upload error:', error);

        this.isUploading = false;
        this.errorMessage = this.extractErrorMessage(
          error,
          'Failed to upload profile picture.'
        );

        input.value = '';
        this.refreshView();
      }
    });
  }

  onProfileImageError(): void {
    this.profileImageUrl = '';
    this.refreshView();
  }

  openDeleteProfilePictureModal(event?: Event): void {
    event?.stopPropagation();

    if (!this.profileImageUrl || this.isUploading || this.isDeletingProfilePicture) {
      return;
    }

    this.isDeleteProfilePictureModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();
  }

  closeDeleteProfilePictureModal(): void {
    if (this.isDeletingProfilePicture) {
      return;
    }

    this.isDeleteProfilePictureModalOpen = false;
    this.refreshView();
  }

  confirmDeleteProfilePicture(): void {
    if (!this.profileImageUrl) {
      return;
    }

    this.isDeletingProfilePicture = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refreshView();

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
        this.refreshView();
      },
      error: (error) => {
        console.error('Profile picture delete error:', error);

        this.isDeletingProfilePicture = false;
        this.isDeleteProfilePictureModalOpen = false;

        this.errorMessage = this.extractErrorMessage(
          error,
          'Failed to delete profile picture.'
        );

        this.refreshView();
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

  openDatePicker(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const input = this.dateOfBirthInput?.nativeElement;
    if (!input) return;

    this.initDateOfBirthPicker();

    input.focus();

    try {
      this.dateOfBirthPicker?.show?.();
    } catch {
      input.click();
    }

    setTimeout(() => this.styleFlowbiteDatePickers(), 0);
  }

  openTravelDatePicker(input: HTMLInputElement): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!this.showTravelDates) {
      this.addTravelDates();

      setTimeout(() => {
        this.initTravelDateRangePicker();
        input?.focus();
        input?.click();
        this.styleFlowbiteDatePickers();
      }, 0);

      return;
    }

    if (!input) return;

    this.initTravelDateRangePicker();

    input.focus();
    input.click();

    setTimeout(() => this.styleFlowbiteDatePickers(), 0);
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

    this.refreshView();
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

  get travelStartDateInvalid(): boolean {
    const control = this.profileForm.get('travelStartDate');
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  get travelEndDateInvalid(): boolean {
    const control = this.profileForm.get('travelEndDate');
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private initDatePickersAfterRender(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {
      this.initDateOfBirthPicker();

      if (this.showTravelDates) {
        this.initTravelDateRangePicker();
      }

      this.startDatePickerObserver();
      this.styleFlowbiteDatePickers();
    }, 0);
  }

  private initDateOfBirthPicker(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const input = this.dateOfBirthInput?.nativeElement;
    if (!input || this.dateOfBirthPicker) return;

    this.dateOfBirthPicker = new Datepicker(input, {
      format: 'yyyy-mm-dd',
      autohide: true,
      clearBtn: true,
      todayBtn: false,
      maxDate: new Date()
    });

    if (!this.dateOfBirthEventsBound) {
      input.addEventListener('changeDate', this.syncDateOfBirthHandler);
      input.addEventListener('change', this.syncDateOfBirthHandler);
      input.addEventListener('show', this.styleDatePickerHandler);
      input.addEventListener('click', this.styleDatePickerHandler);
      input.addEventListener('focus', this.styleDatePickerHandler);

      this.dateOfBirthEventsBound = true;
    }
  }

  private initTravelDateRangePicker(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const container = this.travelDateRangePicker?.nativeElement;
    const startInput = this.travelStartDateInput?.nativeElement;
    const endInput = this.travelEndDateInput?.nativeElement;

    if (!container || !startInput || !endInput || this.travelDateRangePickerInstance) {
      return;
    }

    this.travelDateRangePickerInstance = new DateRangePicker(container, {
      format: 'yyyy-mm-dd',
      autohide: true,
      clearBtn: true,
      todayBtn: false
    });

    if (!this.travelDateEventsBound) {
      startInput.addEventListener('changeDate', this.syncTravelDatesHandler);
      startInput.addEventListener('change', this.syncTravelDatesHandler);
      startInput.addEventListener('show', this.styleDatePickerHandler);
      startInput.addEventListener('click', this.styleDatePickerHandler);
      startInput.addEventListener('focus', this.styleDatePickerHandler);

      endInput.addEventListener('changeDate', this.syncTravelDatesHandler);
      endInput.addEventListener('change', this.syncTravelDatesHandler);
      endInput.addEventListener('show', this.styleDatePickerHandler);
      endInput.addEventListener('click', this.styleDatePickerHandler);
      endInput.addEventListener('focus', this.styleDatePickerHandler);

      this.travelDateEventsBound = true;
    }
  }

  private startDatePickerObserver(): void {
    if (!isPlatformBrowser(this.platformId) || this.datePickerObserver) return;

    this.datePickerObserver = new MutationObserver(() => {
      this.styleFlowbiteDatePickers();
    });

    this.datePickerObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private styleFlowbiteDatePickers(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const pickers = document.querySelectorAll('.datepicker-picker');

    pickers.forEach((picker) => {
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

        if (!clearButton.dataset['profileClearHandled']) {
          clearButton.dataset['profileClearHandled'] = 'true';

          clearButton.addEventListener('click', () => {
            setTimeout(() => {
              this.syncAllDateValues();
              this.refreshView();
            }, 0);
          });
        }
      });
    });
  }

  private syncDateOfBirthValue(): void {
    const input = this.dateOfBirthInput?.nativeElement;
    if (!input) return;

    const control = this.profileForm.get('dateOfBirth');

    control?.setValue(input.value);
    control?.markAsTouched();
    control?.updateValueAndValidity();

    this.refreshView();
  }

  private syncTravelDateValues(): void {
    const startInput = this.travelStartDateInput?.nativeElement;
    const endInput = this.travelEndDateInput?.nativeElement;

    const startControl = this.profileForm.get('travelStartDate');
    const endControl = this.profileForm.get('travelEndDate');

    if (startInput) {
      startControl?.setValue(startInput.value);
      startControl?.markAsTouched();
      startControl?.updateValueAndValidity();
    }

    if (endInput) {
      endControl?.setValue(endInput.value);
      endControl?.markAsTouched();
      endControl?.updateValueAndValidity();
    }

    this.refreshView();
  }

  private syncAllDateValues(): void {
    this.syncDateOfBirthValue();

    if (this.showTravelDates) {
      this.syncTravelDateValues();
    }
  }

  private destroyDatePickers(): void {
    this.destroyDateOfBirthPicker();
    this.destroyTravelDateRangePicker();

    this.datePickerObserver?.disconnect();
    this.datePickerObserver = undefined;
  }

  private destroyDateOfBirthPicker(): void {
    const input = this.dateOfBirthInput?.nativeElement;

    if (input && this.dateOfBirthEventsBound) {
      input.removeEventListener('changeDate', this.syncDateOfBirthHandler);
      input.removeEventListener('change', this.syncDateOfBirthHandler);
      input.removeEventListener('show', this.styleDatePickerHandler);
      input.removeEventListener('click', this.styleDatePickerHandler);
      input.removeEventListener('focus', this.styleDatePickerHandler);
    }

    this.dateOfBirthPicker?.destroy?.();
    this.dateOfBirthPicker = null;
    this.dateOfBirthEventsBound = false;
  }

  private destroyTravelDateRangePicker(): void {
    const startInput = this.travelStartDateInput?.nativeElement;
    const endInput = this.travelEndDateInput?.nativeElement;

    if (this.travelDateEventsBound) {
      startInput?.removeEventListener('changeDate', this.syncTravelDatesHandler);
      startInput?.removeEventListener('change', this.syncTravelDatesHandler);
      startInput?.removeEventListener('show', this.styleDatePickerHandler);
      startInput?.removeEventListener('click', this.styleDatePickerHandler);
      startInput?.removeEventListener('focus', this.styleDatePickerHandler);

      endInput?.removeEventListener('changeDate', this.syncTravelDatesHandler);
      endInput?.removeEventListener('change', this.syncTravelDatesHandler);
      endInput?.removeEventListener('show', this.styleDatePickerHandler);
      endInput?.removeEventListener('click', this.styleDatePickerHandler);
      endInput?.removeEventListener('focus', this.styleDatePickerHandler);
    }

    this.travelDateRangePickerInstance?.destroy?.();
    this.travelDateRangePickerInstance = null;
    this.travelDateEventsBound = false;
  }

  private refreshView(): void {
    try {
      this.cdr.detectChanges();
    } catch {
      this.cdr.markForCheck();
    }
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
        this.refreshView();
      },
      error: (error) => {
        console.error('Profile refresh after picture upload error:', error);
        this.refreshView();
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