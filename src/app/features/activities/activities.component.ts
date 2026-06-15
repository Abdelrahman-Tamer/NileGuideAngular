import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Datepicker } from 'flowbite-datepicker';

import { ActivitiesService } from './activities.service';
import { ActivitiesStateService } from './activities-state.service';
import { WishlistService } from '../wishlist/wishlist.service';
import { ScheduleService } from '../schedule/schedule.service';
import { ProfileService } from '../profile/profile.service';
import { UserProfileResponse } from '../profile/profile';

import {
  ActivityCategory,
  ActivityCity,
  ActivityDetails,
  ActivityListItem,
  ActivityOpeningHour,
  ActivityProvider,
  ActivitySortBy,
} from './activities.interfaces';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './activities.component.html',
  styleUrl: './activities.component.css',
})
export class ActivitiesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('planDateInput')
  planDateInput?: ElementRef<HTMLInputElement>;

  private readonly activitiesService = inject(ActivitiesService);
  private readonly activitiesStateService = inject(ActivitiesStateService);
  private readonly wishlistService = inject(WishlistService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly profileService = inject(ProfileService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastr = inject(ToastrService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  activities: ActivityListItem[] = [];
  categories: ActivityCategory[] = [];
  cities: ActivityCity[] = [];

  selectedCategoryIds: number[] = [];
  selectedCityIds: number[] = [];

  searchTerm = '';
  sortBy: ActivitySortBy = 'default';

  totalCount = 0;
  currentPage = 1;
  pageSize = 9;

  isLoading = false;
  private shouldScrollAfterLoad = false;
  private restoredFromCache = false;
  private restoredScrollY = 0;

  wishlistedIds = new Set<number>();
  wishlistLoadingIds = new Set<number>();

  isPlanModalOpen = false;
  isPlanModalLoading = false;
  selectedActivityDetails: ActivityDetails | null = null;

  planDate = '';
  planStartTime = '';
  planStartPeriod: 'AM' | 'PM' = 'AM';
  isSubmittingPlan = false;
  planValidationError = '';

  private userProfile: UserProfileResponse | null = null;

  private planDatePicker: any;
  private planDateEventsBound = false;

  private readonly syncPlanDateHandler = () => this.syncPlanDateValue();

  ngOnInit(): void {
    this.restoreActivitiesState();

    this.getCategories();
    this.getCities();
    this.loadWishlistIds();
    this.loadUserProfile();
    this.listenToProfileFilters();
  }

  ngAfterViewInit(): void {
    this.initPlanDatePickerAfterRender();
  }

  ngOnDestroy(): void {
    this.saveActivitiesState();
    this.destroyPlanDatePicker();
  }

  private listenToProfileFilters(): void {
    this.route.queryParamMap.subscribe((params) => {
      const cityIds = this.parseIds(params.get('cities'));
      const categoryIds = this.parseIds(params.get('categories'));

      const hasQueryFilters = cityIds.length > 0 || categoryIds.length > 0;

      if (this.restoredFromCache && !hasQueryFilters) {
        this.restoredFromCache = false;
        this.restoreScrollPosition();
        return;
      }

      this.selectedCityIds = cityIds;
      this.selectedCategoryIds = categoryIds;
      this.currentPage = 1;
      this.getActivities();
    });
  }

  private loadUserProfile(): void {
    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load user profile for travel dates validation', error);
        this.userProfile = null;
        this.cdr.detectChanges();
      },
    });
  }

  private parseIds(value: string | null): number[] {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id));
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get computedEndTime(): string {
    if (!this.selectedActivityDetails?.duration || !this.planStartTime) return '--';
    if (!this.isValidTwelveHourTimeFormat(this.planStartTime)) return '--';

    const start24 = this.convertTo24Hour(this.planStartTime, this.planStartPeriod);
    const startMinutes = this.timeToMinutes(start24);
    const endMinutes = startMinutes + this.selectedActivityDetails.duration;

    return this.minutesTo12HourTime(endMinutes);
  }

  get planOpenTime(): string {
    return this.selectedActivityDetails?.openingHours?.[0]?.openTime ?? '--';
  }

  get planCloseTime(): string {
    return this.selectedActivityDetails?.openingHours?.[0]?.closeTime ?? '--';
  }

  get formattedSelectedDuration(): string {
    if (!this.selectedActivityDetails?.duration) return '--';

    const hours = Math.floor(this.selectedActivityDetails.duration / 60);
    const minutes = this.selectedActivityDetails.duration % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    return `${minutes}m`;
  }

  getActivities(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.activitiesService
      .getActivities({
        categoryIds: this.selectedCategoryIds,
        cityIds: this.selectedCityIds,
        search: this.searchTerm,
        sortBy: this.sortBy,
        page: this.currentPage,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (response) => {
          this.activities = response.items;
          this.totalCount = response.totalCount;
          this.currentPage = response.page;
          this.pageSize = response.pageSize;
          this.isLoading = false;

          this.saveActivitiesState();
          this.cdr.detectChanges();

          if (this.shouldScrollAfterLoad) {
            this.shouldScrollAfterLoad = false;
            setTimeout(() => {
              this.scrollToCardsTop();
            }, 0);
          }
        },
        error: (_error: HttpErrorResponse) => {
          this.isLoading = false;
          this.shouldScrollAfterLoad = false;
          this.cdr.detectChanges();
        },
      });
  }

  getCategories(): void {
    this.activitiesService.getCategories().subscribe({
      next: (response) => {
        this.categories = response;
        this.saveActivitiesState();
        this.cdr.detectChanges();
      },
    });
  }

  getCities(): void {
    this.activitiesService.getCities().subscribe({
      next: (response) => {
        this.cities = response;
        this.saveActivitiesState();
        this.cdr.detectChanges();
      },
    });
  }

  loadWishlistIds(): void {
    this.wishlistService.getWishlistedIds().subscribe({
      next: (ids) => {
        this.wishlistedIds = new Set(ids);
        this.cdr.detectChanges();
      },
    });
  }

  toggleWishlist(activityId: number): void {
    if (this.wishlistLoadingIds.has(activityId)) return;

    this.wishlistLoadingIds.add(activityId);
    this.cdr.detectChanges();

    const wasWishlisted = this.wishlistedIds.has(activityId);

    const request = wasWishlisted
      ? this.wishlistService.removeFromWishlist(activityId)
      : this.wishlistService.addToWishlist(activityId);

    request.subscribe({
      next: () => {
        const updated = new Set(this.wishlistedIds);

        if (updated.has(activityId)) {
          updated.delete(activityId);
          this.toastr.info('Removed from wishlist');
        } else {
          updated.add(activityId);
          this.toastr.success('Added to wishlist');
        }

        this.wishlistedIds = updated;
        this.wishlistLoadingIds.delete(activityId);
        this.cdr.detectChanges();
      },
      error: () => {
        this.wishlistLoadingIds.delete(activityId);
        this.toastr.error(
          wasWishlisted
            ? 'Failed to remove from wishlist'
            : 'Failed to add to wishlist'
        );
        this.cdr.detectChanges();
      },
    });
  }

  isWishlisted(activityId: number): boolean {
    return this.wishlistedIds.has(activityId);
  }

  isWishlistLoading(activityId: number): boolean {
    return this.wishlistLoadingIds.has(activityId);
  }

  openPlanModal(activityId: number): void {
    this.isPlanModalOpen = true;
    this.isPlanModalLoading = true;
    this.selectedActivityDetails = null;
    this.planDate = '';
    this.planStartTime = '';
    this.planStartPeriod = 'AM';
    this.planValidationError = '';
    this.cdr.detectChanges();

    this.activitiesService.getActivityById(activityId).subscribe({
      next: (response) => {
        this.selectedActivityDetails = response;
        this.isPlanModalLoading = false;
        this.cdr.detectChanges();
        this.initPlanDatePickerAfterRender();
      },
      error: () => {
        this.isPlanModalLoading = false;
        this.isPlanModalOpen = false;
        this.toastr.error('Failed to load activity details');
        this.cdr.detectChanges();
      },
    });
  }

  closePlanModal(): void {
    this.destroyPlanDatePicker();

    this.isPlanModalOpen = false;
    this.isPlanModalLoading = false;
    this.selectedActivityDetails = null;
    this.planDate = '';
    this.planStartTime = '';
    this.planStartPeriod = 'AM';
    this.planValidationError = '';
    this.isSubmittingPlan = false;
    this.cdr.detectChanges();
  }

  openPlanDatePicker(): void {
    this.initPlanDatePickerAfterRender();

    setTimeout(() => {
      this.planDateInput?.nativeElement.focus();
      this.planDatePicker?.show?.();
      this.stylePlanDatePicker();
    }, 0);
  }

  blockPlanDateTyping(event: KeyboardEvent): void {
    const allowedKeys = [
      'Tab',
      'Shift',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Escape',
    ];

    if (!allowedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  onPlanDateChange(): void {
    this.planValidationError = '';

    if (this.planDate && !this.isValidDateFormat(this.planDate)) {
      this.planValidationError = 'Date must be in YYYY-MM-DD format.';
    } else if (this.planDate && this.isPlanDateOutsideTravelDates()) {
      this.planValidationError = this.getTravelDatesValidationMessage();
    }

    this.cdr.detectChanges();
  }

  onPlanStartTimeChange(): void {
    this.planValidationError = '';

    if (this.planStartTime && !this.isValidTwelveHourTimeFormat(this.planStartTime)) {
      this.planValidationError = 'Time must be in hh:mm format.';
      this.cdr.detectChanges();
      return;
    }

    if (this.planStartTime && this.isSelectedTimeOutsideOpeningHours()) {
      this.planValidationError =
        'Selected time is outside this activity opening hours.';
    }

    this.cdr.detectChanges();
  }

  onPlanStartPeriodChange(): void {
    this.planValidationError = '';

    if (this.planStartTime && !this.isValidTwelveHourTimeFormat(this.planStartTime)) {
      this.planValidationError = 'Time must be in hh:mm format.';
      this.cdr.detectChanges();
      return;
    }

    if (this.planStartTime && this.isSelectedTimeOutsideOpeningHours()) {
      this.planValidationError =
        'Selected time is outside this activity opening hours.';
    }

    this.cdr.detectChanges();
  }

  isSelectedTimeOutsideOpeningHours(): boolean {
    if (!this.selectedActivityDetails || !this.planStartTime) return false;
    if (!this.isValidTwelveHourTimeFormat(this.planStartTime)) return false;

    const hours = this.selectedActivityDetails.openingHours;
    if (!hours?.length) return false;

    const start24 = this.convertTo24Hour(this.planStartTime, this.planStartPeriod);

    const firstSlot = hours[0];
    const selectedStart = this.timeToMinutes(start24);
    const selectedEnd = selectedStart + this.selectedActivityDetails.duration;
    const openMinutes = this.openingHourToMinutes(firstSlot, 'open');
    const closeMinutes = this.openingHourToMinutes(firstSlot, 'close');

    if (selectedStart < openMinutes) return true;
    if (selectedEnd > closeMinutes) return true;

    return false;
  }

  submitPlan(): void {
    if (!this.selectedActivityDetails) return;

    if (!this.planDate || !this.planStartTime) {
      this.planValidationError = 'Please select date and start time.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.isValidDateFormat(this.planDate)) {
      this.planValidationError = 'Date must be in YYYY-MM-DD format.';
      this.cdr.detectChanges();
      return;
    }

    if (this.isPlanDateOutsideTravelDates()) {
      this.planValidationError = this.getTravelDatesValidationMessage();
      this.cdr.detectChanges();
      return;
    }

    if (!this.isValidTwelveHourTimeFormat(this.planStartTime)) {
      this.planValidationError = 'Time must be in hh:mm format.';
      this.cdr.detectChanges();
      return;
    }

    if (this.isSelectedTimeOutsideOpeningHours()) {
      this.planValidationError =
        'Selected time is outside this activity opening hours.';
      this.cdr.detectChanges();
      return;
    }

    const startTime24 = this.convertTo24Hour(
      this.planStartTime,
      this.planStartPeriod
    );

    const newStart = this.timeToMinutes(startTime24);
    const newEnd = newStart + this.selectedActivityDetails.duration;

    this.isSubmittingPlan = true;
    this.planValidationError = '';
    this.cdr.detectChanges();

    this.scheduleService.getSchedule().subscribe({
      next: (response) => {
        const items = response.items ?? [];

        const hasConflict = items.some((item) => {
          if (item.scheduledDate !== this.planDate) return false;

          const existingStart = this.timeToMinutes(item.startTime);
          const existingEnd = this.timeToMinutes(item.endTime);

          return newStart < existingEnd && newEnd > existingStart;
        });

        if (hasConflict) {
          this.isSubmittingPlan = false;
          this.planValidationError =
            'This time conflicts with another scheduled activity.';
          this.cdr.detectChanges();
          return;
        }

        this.scheduleService
          .addToSchedule({
            activityId: this.selectedActivityDetails!.activityID,
            scheduledDate: this.planDate,
            startTime: startTime24,
          })
          .subscribe({
            next: () => {
              this.isSubmittingPlan = false;
              this.toastr.success('Added to schedule');
              this.closePlanModal();
              this.cdr.detectChanges();
            },
            error: (error: HttpErrorResponse) => {
              this.isSubmittingPlan = false;
              this.planValidationError =
                error.error?.message || 'Failed to add to schedule.';
              this.toastr.error('Failed to add to schedule');
              this.cdr.detectChanges();
            },
          });
      },
      error: () => {
        this.isSubmittingPlan = false;
        this.planValidationError = 'Failed to validate schedule conflict.';
        this.toastr.error('Failed to validate schedule conflict');
        this.cdr.detectChanges();
      },
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.getActivities();
    this.scrollToCardsTop();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.getActivities();
    this.scrollToCardsTop();
  }

  onCategoryPress(event: MouseEvent, categoryId: number): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.selectedCategoryIds.includes(categoryId)) {
      this.selectedCategoryIds = this.selectedCategoryIds.filter((id) => id !== categoryId);
    } else {
      this.selectedCategoryIds = [...this.selectedCategoryIds, categoryId];
    }

    this.currentPage = 1;
    this.shouldScrollAfterLoad = true;
    this.cdr.detectChanges();
    this.getActivities();
  }

  onCityPress(event: MouseEvent, cityId: number): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.selectedCityIds.includes(cityId)) {
      this.selectedCityIds = this.selectedCityIds.filter((id) => id !== cityId);
    } else {
      this.selectedCityIds = [...this.selectedCityIds, cityId];
    }

    this.currentPage = 1;
    this.shouldScrollAfterLoad = true;
    this.cdr.detectChanges();
    this.getActivities();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.getActivities();
    this.scrollToCardsTop();
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.getActivities();
      this.scrollToCardsTop();
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.getActivities();
      this.scrollToCardsTop();
    }
  }

  scrollToCardsTop(): void {
    const element = document.getElementById('activities-list');

    if (!element) return;

    const y = element.getBoundingClientRect().top + window.scrollY - 110;

    window.scrollTo({
      top: y,
      behavior: 'smooth',
    });
  }

  isCategorySelected(categoryId: number): boolean {
    return this.selectedCategoryIds.includes(categoryId);
  }

  isCitySelected(cityId: number): boolean {
    return this.selectedCityIds.includes(cityId);
  }

  getOpenTime(activity: ActivityListItem): string {
    return activity.openingHours?.[0]?.openTime ?? '--';
  }

  getCloseTime(activity: ActivityListItem): string {
    return activity.openingHours?.[0]?.closeTime ?? '--';
  }

  getProviderIcon(provider: ActivityProvider): string {
    const name = provider.providerName.toLowerCase();

    if (name.includes('viator')) return 'fa-solid fa-link';
    if (name.includes('getyourguide')) return 'fa-solid fa-plane-departure';
    if (name.includes('tripadvisor')) return 'fa-solid fa-globe';

    return 'fa-solid fa-link';
  }

  getRoundedRating(rating: number): string {
    return rating.toFixed(1);
  }

  private restoreActivitiesState(): void {
    const hasQueryFilters =
      this.route.snapshot.queryParamMap.has('cities') ||
      this.route.snapshot.queryParamMap.has('categories');

    if (hasQueryFilters) {
      return;
    }

    const state = this.activitiesStateService.getState();

    if (!state) {
      return;
    }

    this.activities = state.activities ?? [];
    this.categories = state.categories ?? [];
    this.cities = state.cities ?? [];

    this.selectedCategoryIds = state.selectedCategoryIds ?? [];
    this.selectedCityIds = state.selectedCityIds ?? [];

    this.searchTerm = state.searchTerm ?? '';
    this.sortBy = state.sortBy ?? 'default';

    this.totalCount = state.totalCount ?? 0;
    this.currentPage = state.currentPage ?? 1;
    this.pageSize = state.pageSize ?? 9;

    this.restoredScrollY = state.scrollY ?? 0;
    this.restoredFromCache = this.activities.length > 0;

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private saveActivitiesState(): void {
    const scrollY = isPlatformBrowser(this.platformId) ? window.scrollY : 0;

    this.activitiesStateService.saveState({
      activities: this.activities,
      categories: this.categories,
      cities: this.cities,

      selectedCategoryIds: this.selectedCategoryIds,
      selectedCityIds: this.selectedCityIds,

      searchTerm: this.searchTerm,
      sortBy: this.sortBy,

      totalCount: this.totalCount,
      currentPage: this.currentPage,
      pageSize: this.pageSize,

      scrollY,
    });
  }

  private restoreScrollPosition(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.restoredScrollY) {
      return;
    }

    setTimeout(() => {
      window.scrollTo({
        top: this.restoredScrollY,
        behavior: 'auto',
      });

      this.restoredScrollY = 0;
    }, 0);
  }

  private initPlanDatePickerAfterRender(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      const input = this.planDateInput?.nativeElement;

      if (!input) {
        return;
      }

      if (!this.planDatePicker) {
        this.planDatePicker = new Datepicker(input, {
          format: 'yyyy-mm-dd',
          autohide: true,
          todayBtn: false,
          clearBtn: true,
        });
      }

      if (!this.planDateEventsBound) {
        input.addEventListener('changeDate', this.syncPlanDateHandler);
        input.addEventListener('change', this.syncPlanDateHandler);
        this.planDateEventsBound = true;
      }

      this.stylePlanDatePicker();
    }, 0);
  }

  private syncPlanDateValue(): void {
    const value = this.planDateInput?.nativeElement.value ?? '';

    this.planDate = value;
    this.onPlanDateChange();
    this.cdr.detectChanges();
  }

  private stylePlanDatePicker(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      const datepickers = document.querySelectorAll(
        '.datepicker, .datepicker-dropdown'
      );

      datepickers.forEach((datepicker) => {
        const buttons = datepicker.querySelectorAll('button');

        buttons.forEach((button) => {
          const btn = button as HTMLButtonElement;

          if (btn.textContent?.trim().toLowerCase() === 'clear') {
            btn.className = '';

            btn.style.display = 'block';
            btn.style.width = 'fit-content';
            btn.style.minWidth = '170px';
            btn.style.margin = '10px auto 0';
            btn.style.padding = '12px 34px';
            btn.style.border = '1px solid rgba(255,255,255,0.75)';
            btn.style.borderRadius = '9999px';
            btn.style.fontWeight = '600';
            btn.style.fontSize = '14px';
            btn.style.lineHeight = '1';
            btn.style.cursor = 'pointer';
            btn.style.transition =
              'background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease';
            btn.style.boxShadow = 'none';

            btn.style.backgroundColor = '#eab308';
            btn.style.color = '#000';

            btn.onmouseenter = () => {
              btn.style.backgroundColor = '#ca8a04';
            };

            btn.onmouseleave = () => {
              btn.style.backgroundColor = '#eab308';
            };
          }
        });
      });
    }, 50);
  }

  private destroyPlanDatePicker(): void {
    const input = this.planDateInput?.nativeElement;

    if (input && this.planDateEventsBound) {
      input.removeEventListener('changeDate', this.syncPlanDateHandler);
      input.removeEventListener('change', this.syncPlanDateHandler);
    }

    this.planDateEventsBound = false;

    try {
      this.planDatePicker?.destroy?.();
    } catch {
      // ignore
    }

    this.planDatePicker = null;
  }

  private isValidDateFormat(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private isPlanDateOutsideTravelDates(): boolean {
    if (!this.userProfile?.hasTravelDates) return false;

    const travelStartDate = this.toDateOnly(this.userProfile.travelStartDate);
    const travelEndDate = this.toDateOnly(this.userProfile.travelEndDate);

    if (!travelStartDate || !travelEndDate) return false;

    return this.planDate < travelStartDate || this.planDate > travelEndDate;
  }

  private getTravelDatesValidationMessage(): string {
    const travelStartDate = this.toDateOnly(this.userProfile?.travelStartDate);
    const travelEndDate = this.toDateOnly(this.userProfile?.travelEndDate);

    if (!travelStartDate || !travelEndDate) {
      return 'This activity is outside your selected trip dates.';
    }

    return `This activity is outside your selected trip dates. Your trip is from ${this.formatDateLabel(travelStartDate)} to ${this.formatDateLabel(travelEndDate)}.`;
  }

  private toDateOnly(value: string | null | undefined): string {
    if (!value) return '';

    return String(value).split('T')[0];
  }

  private formatDateLabel(value: string): string {
    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
      return value;
    }

    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private isValidTwelveHourTimeFormat(value: string): boolean {
    return /^(0?[1-9]|1[0-2]):([0-5]\d)$/.test(value);
  }

  private convertTo24Hour(
    time: string,
    period: 'AM' | 'PM'
  ): string {
    const [rawHours, minutes] = time.split(':').map(Number);
    let hours = rawHours;

    if (period === 'AM') {
      if (hours === 12) {
        hours = 0;
      }
    } else {
      if (hours !== 12) {
        hours += 12;
      }
    }

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60) + minutes;
  }

  private minutesTo12HourTime(totalMinutes: number): string {
    const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const hours24 = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;

    const period = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;

    if (hours12 === 0) {
      hours12 = 12;
    }

    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  private openingHourToMinutes(
    item: ActivityOpeningHour,
    type: 'open' | 'close'
  ): number {
    const hour = type === 'open' ? item.openHour : item.closeHour;
    const amPm = (type === 'open' ? item.openAmPm : item.closeAmPm).toUpperCase();

    let normalizedHour = hour;

    if (amPm === 'AM' && normalizedHour === 12) {
      normalizedHour = 0;
    } else if (amPm === 'PM' && normalizedHour !== 12) {
      normalizedHour += 12;
    }

    return normalizedHour * 60;
  }
}