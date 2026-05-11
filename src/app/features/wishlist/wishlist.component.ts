import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { WishlistService } from './wishlist.service';
import { ActivitiesService } from '../activities/activities.service';
import { ScheduleService } from '../schedule/schedule.service';
import {
  ActivityDetails,
  ActivityListItem,
  ActivityOpeningHour,
  ActivityProvider,
} from '../activities/activities.interfaces';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.css',
})
export class WishlistComponent implements OnInit {
  private readonly wishlistService = inject(WishlistService);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastr = inject(ToastrService);

  wishlistItems: ActivityListItem[] = [];

  totalCount = 0;
  currentPage = 1;
  pageSize = 9;

  isLoading = false;
  removingIds = new Set<number>();
  isClearingAll = false;

  isPlanModalOpen = false;
  isPlanModalLoading = false;
  selectedActivityDetails: ActivityDetails | null = null;

  planDate = '';
  planStartTime = '';
  planStartPeriod: 'AM' | 'PM' = 'AM';
  isSubmittingPlan = false;
  planValidationError = '';

  ngOnInit(): void {
    this.getWishlist();
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

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  }

  getWishlist(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.wishlistService.getWishlist(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.wishlistItems = response.items;
        this.totalCount = response.totalCount;
        this.currentPage = response.page;
        this.pageSize = response.pageSize;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (_error: HttpErrorResponse) => {
        this.isLoading = false;
        this.toastr.error('Failed to load wishlist');
        this.cdr.detectChanges();
      },
    });
  }

  removeFromWishlist(activityId: number): void {
    if (this.removingIds.has(activityId) || this.isClearingAll) return;

    this.removingIds.add(activityId);
    this.cdr.detectChanges();

    this.wishlistService.removeFromWishlist(activityId).subscribe({
      next: () => {
        this.wishlistItems = this.wishlistItems.filter(
          (item) => item.activityID !== activityId
        );
        this.totalCount = Math.max(0, this.totalCount - 1);
        this.toastr.info('Removed from wishlist');

        if (this.wishlistItems.length === 0 && this.currentPage > 1) {
          this.currentPage--;
          this.getWishlist();
        } else {
          this.removingIds.delete(activityId);
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.removingIds.delete(activityId);
        this.toastr.error('Failed to remove from wishlist');
        this.cdr.detectChanges();
      },
    });
  }

  clearAll(): void {
    const ids = this.wishlistItems.map((item) => item.activityID);

    if (ids.length === 0) {
      this.toastr.info('Wishlist is already empty');
      return;
    }

    if (this.isClearingAll) return;

    this.isClearingAll = true;
    this.cdr.detectChanges();

    ids.forEach((id) => this.removingIds.add(id));
    this.cdr.detectChanges();

    forkJoin(ids.map((id) => this.wishlistService.removeFromWishlist(id))).subscribe({
      next: () => {
        this.wishlistItems = [];
        this.totalCount = 0;
        this.removingIds.clear();
        this.isClearingAll = false;
        this.toastr.success('Wishlist cleared');
        this.cdr.detectChanges();
      },
      error: () => {
        this.removingIds.clear();
        this.isClearingAll = false;
        this.toastr.error('Failed to clear wishlist');
        this.getWishlist();
      },
    });
  }

  openPlanModal(activityId: number): void {
    this.isPlanModalOpen = true;
    this.isPlanModalLoading = true;
    this.selectedActivityDetails = null;
    this.planDate = '';
    this.planStartTime = '';
    this.planStartPeriod = 'AM';
    this.planValidationError = '';
    this.isSubmittingPlan = false;
    this.cdr.detectChanges();

    this.activitiesService.getActivityById(activityId).subscribe({
      next: (response) => {
        this.selectedActivityDetails = response as ActivityDetails;
        this.isPlanModalLoading = false;
        this.cdr.detectChanges();
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

  onPlanDateChange(): void {
    this.planValidationError = '';

    if (this.planDate && !this.isValidDateFormat(this.planDate)) {
      this.planValidationError = 'Date must be in YYYY-MM-DD format.';
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
      this.planValidationError = 'Selected time is outside this activity opening hours.';
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
      this.planValidationError = 'Selected time is outside this activity opening hours.';
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

    if (!this.isValidTwelveHourTimeFormat(this.planStartTime)) {
      this.planValidationError = 'Time must be in hh:mm format.';
      this.cdr.detectChanges();
      return;
    }

    if (this.isSelectedTimeOutsideOpeningHours()) {
      this.planValidationError = 'Selected time is outside this activity opening hours.';
      this.cdr.detectChanges();
      return;
    }

    const startTime24 = this.convertTo24Hour(this.planStartTime, this.planStartPeriod);
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
          this.planValidationError = 'This time conflicts with another scheduled activity.';
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

  isRemoving(activityId: number): boolean {
    return this.removingIds.has(activityId);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.getWishlist();
    this.scrollToCardsTop();
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.getWishlist();
      this.scrollToCardsTop();
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.getWishlist();
      this.scrollToCardsTop();
    }
  }

  scrollToCardsTop(): void {
    const element = document.getElementById('wishlist-list');

    if (!element) return;

    const y = element.getBoundingClientRect().top + window.scrollY - 110;

    window.scrollTo({
      top: y,
      behavior: 'smooth',
    });
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

  private isValidDateFormat(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private isValidTwelveHourTimeFormat(value: string): boolean {
    return /^(0?[1-9]|1[0-2]):([0-5]\d)$/.test(value);
  }

  private convertTo24Hour(time: string, period: 'AM' | 'PM'): string {
    const [rawHours, minutes] = time.split(':').map(Number);
    let hours = rawHours;

    if (period === 'AM') {
      if (hours === 12) hours = 0;
    } else {
      if (hours !== 12) hours += 12;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesTo12HourTime(totalMinutes: number): string {
    const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const hours24 = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;

    const period = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;

    if (hours12 === 0) hours12 = 12;

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