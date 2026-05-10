import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { WishlistService } from './wishlist.service';
import { ActivityListItem, ActivityProvider } from '../activities/activities.interfaces';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.css',
})
export class WishlistComponent implements OnInit {
  private readonly wishlistService = inject(WishlistService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastr = inject(ToastrService);

  wishlistItems: ActivityListItem[] = [];

  totalCount = 0;
  currentPage = 1;
  pageSize = 9;

  isLoading = false;
  removingIds = new Set<number>();
  isClearingAll = false;

  ngOnInit(): void {
    this.getWishlist();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
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
}