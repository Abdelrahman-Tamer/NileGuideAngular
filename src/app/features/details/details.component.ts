import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

import { ActivitiesService } from '../activities/activities.service';
import { WishlistService } from '../wishlist/wishlist.service';
import {
  ActivityDetails,
  ActivityProvider,
  ActivityReview,
  CreateActivityReviewPayload,
} from '../activities/activities.interfaces';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.css',
})
export class DetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly wishlistService = inject(WishlistService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);

  activity: ActivityDetails | null = null;
  reviews: ActivityReview[] = [];

  isLoading = true;
  isReviewsLoading = true;
  isSubmittingReview = false;
  isGalleryOpen = false;
  selectedGalleryIndex = 0;

  isWishlisted = false;
  isWishlistLoading = false;

  reviewForm: CreateActivityReviewPayload = {
    reviewerCity: '',
    rating: 5,
    comment: '',
  };

  reviewError = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.isLoading = false;
      this.isReviewsLoading = false;
      this.toastr.error('Invalid activity id');
      this.cdr.detectChanges();
      return;
    }

    this.loadActivity(id);
    this.loadReviews(id);
    this.loadWishlistStatus(id);
  }

  get heroImage(): string {
    return this.activity?.images?.[0] || '/Photo/Aswan.png';
  }

  get galleryImages(): string[] {
    return this.activity?.images?.length
      ? this.activity.images
      : ['/Photo/Aswan.png'];
  }

  get averageRating(): number {
    if (!this.reviews.length) return 0;

    const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / this.reviews.length;
  }

  get reviewsCount(): number {
    return this.reviews.length;
  }

  get formattedDuration(): string {
    const duration = this.activity?.duration ?? 0;
    if (!duration) return '--';

    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  }

  get locationText(): string {
    if (!this.activity) return '--';
    return `${this.activity.cityName}`;
  }

  get coordinatesText(): string {
    if (!this.activity) return '--';
    return `${this.activity.latitude.toFixed(3)}° N · ${this.activity.longitude.toFixed(3)}° E`;
  }

  get primaryProvider(): ActivityProvider | null {
    return this.activity?.providers?.[0] ?? null;
  }

  loadActivity(activityId: number): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.activitiesService.getActivityById(activityId).subscribe({
      next: (response) => {
        this.activity = response;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Failed to load activity details');
        this.cdr.detectChanges();
      },
    });
  }

  loadReviews(activityId: number): void {
    this.isReviewsLoading = true;
    this.cdr.detectChanges();

    this.activitiesService.getActivityReviews(activityId).subscribe({
      next: (response) => {
        this.reviews = [...response].sort(
          (a, b) =>
            new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime()
        );
        this.isReviewsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reviews = [];
        this.isReviewsLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadWishlistStatus(activityId: number): void {
    this.wishlistService.getWishlistStatus(activityId).subscribe({
      next: (response) => {
        this.isWishlisted = response.isWishlisted;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isWishlisted = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleWishlist(): void {
    if (!this.activity || this.isWishlistLoading) return;

    this.isWishlistLoading = true;
    this.cdr.detectChanges();

    const request = this.isWishlisted
      ? this.wishlistService.removeFromWishlist(this.activity.activityID)
      : this.wishlistService.addToWishlist(this.activity.activityID);

    request.subscribe({
      next: (response) => {
        this.isWishlisted = !this.isWishlisted;
        this.isWishlistLoading = false;
        this.toastr.success(
          response.message ||
            (this.isWishlisted ? 'Added to wishlist' : 'Removed from wishlist')
        );
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.isWishlistLoading = false;
        this.toastr.error(
          error.error?.message || 'Failed to update wishlist'
        );
        this.cdr.detectChanges();
      },
    });
  }

  onReviewerCityInput(): void {
    const value = this.reviewForm.reviewerCity ?? '';
    if (!value) return;

    this.reviewForm.reviewerCity =
      value.charAt(0).toUpperCase() + value.slice(1);
    this.cdr.detectChanges();
  }

  submitReview(): void {
    if (!this.activity) return;

    this.reviewError = '';

    if (!this.reviewForm.reviewerCity.trim()) {
      this.reviewError = 'City is required.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.reviewForm.comment.trim()) {
      this.reviewError = 'Comment is required.';
      this.cdr.detectChanges();
      return;
    }

    if (this.reviewForm.comment.trim().length < 10) {
      this.reviewError = 'Comment must be at least 10 characters.';
      this.cdr.detectChanges();
      return;
    }

    if (this.reviewForm.rating < 1 || this.reviewForm.rating > 5) {
      this.reviewError = 'Rating must be between 1 and 5.';
      this.cdr.detectChanges();
      return;
    }

    this.isSubmittingReview = true;
    this.cdr.detectChanges();

    this.activitiesService
      .createActivityReview(this.activity.activityID, {
        reviewerCity: this.reviewForm.reviewerCity.trim(),
        rating: this.reviewForm.rating,
        comment: this.reviewForm.comment.trim(),
      })
      .subscribe({
        next: () => {
          this.isSubmittingReview = false;
          this.reviewForm = {
            reviewerCity: '',
            rating: 5,
            comment: '',
          };
          this.toastr.success('Review submitted successfully');
          this.loadReviews(this.activity!.activityID);
          this.cdr.detectChanges();
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmittingReview = false;
          this.reviewError =
            error.error?.message ||
            error.error?.title ||
            'Failed to submit review.';
          this.toastr.error('Failed to submit review');
          this.cdr.detectChanges();
        },
      });
  }

  openGallery(): void {
    this.selectedGalleryIndex = 0;
    this.isGalleryOpen = true;
    this.cdr.detectChanges();
  }

  closeGallery(): void {
    this.isGalleryOpen = false;
    this.cdr.detectChanges();
  }

  prevGalleryImage(): void {
    if (!this.galleryImages.length) return;
    this.selectedGalleryIndex =
      (this.selectedGalleryIndex - 1 + this.galleryImages.length) %
      this.galleryImages.length;
    this.cdr.detectChanges();
  }

  nextGalleryImage(): void {
    if (!this.galleryImages.length) return;
    this.selectedGalleryIndex =
      (this.selectedGalleryIndex + 1) % this.galleryImages.length;
    this.cdr.detectChanges();
  }

  goToGalleryImage(index: number): void {
    this.selectedGalleryIndex = index;
    this.cdr.detectChanges();
  }

  openMap(): void {
    if (!this.activity) return;

    const url = `https://www.google.com/maps?q=${this.activity.latitude},${this.activity.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  shareActivity(): void {
    if (!this.activity) return;

    const shareUrl = window.location.href;

    if (navigator.share) {
      navigator
        .share({
          title: this.activity.activityName,
          text: this.activity.description,
          url: shareUrl,
        })
        .catch(() => {});
      return;
    }

    navigator.clipboard.writeText(shareUrl);
    this.toastr.success('Link copied');
  }

  getStars(rating: number): number[] {
    const safeRating = Math.max(0, Math.min(5, Math.round(rating)));
    return Array.from({ length: safeRating }, (_, i) => i);
  }

  getEmptyStars(rating: number): number[] {
    const safeRating = Math.max(0, Math.min(5, Math.round(rating)));
    return Array.from({ length: 5 - safeRating }, (_, i) => i);
  }

  formatReviewDate(date: string): string {
    const parsed = new Date(date);

    return parsed.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  getProviderIcon(provider: ActivityProvider): string {
    const name = provider.providerName.toLowerCase();

    if (name.includes('viator')) return 'fa-solid fa-link';
    if (name.includes('getyourguide')) return 'fa-solid fa-plane-departure';
    if (name.includes('tripadvisor')) return 'fa-solid fa-globe';

    return 'fa-solid fa-link';
  }
}