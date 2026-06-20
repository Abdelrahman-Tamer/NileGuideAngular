import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';

import { ActivitiesService } from '../../../activities/activities.service';
import {
  ActivityDetails,
  ActivityListItem,
} from '../../../activities/activities.interfaces';

interface PopularActivityCard extends ActivityListItem {
  duration?: number;
}

@Component({
  selector: 'app-second-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './second-home.component.html',
  styleUrl: './second-home.component.css',
})
export class SecondHomeComponent implements OnInit {
  private readonly activitiesService = inject(ActivitiesService);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  errorMessage = '';
  popularActivities: PopularActivityCard[] = [];

  ngOnInit(): void {
    this.loadPopularActivities();
  }

  private loadPopularActivities(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.popularActivities = [];
    this.cdr.detectChanges();

    this.activitiesService
      .getActivities({
        page: 1,
        pageSize: 9,
      })
      .pipe(
        map((response) => {
          const activities = response.items ?? [];

          return activities
            .sort((a, b) => {
              const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);

              if (ratingDiff !== 0) return ratingDiff;

              return (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0);
            })
            .slice(0, 4);
        }),

        switchMap((topActivities) => {
          if (!topActivities.length) {
            return of([] as PopularActivityCard[]);
          }

          const detailsRequests = topActivities.map((activity) =>
            this.activitiesService.getActivityById(activity.activityID).pipe(
              map((details: ActivityDetails) => ({
                ...activity,
                duration: details.duration,
              })),
              catchError((error) => {
                console.error(
                  `Failed to load details for activity ${activity.activityID}:`,
                  error
                );

                return of({
                  ...activity,
                  duration: undefined,
                });
              })
            )
          );

          return forkJoin(detailsRequests);
        }),

        catchError((error) => {
          console.error('Popular activities API error:', error);
          this.errorMessage = 'Failed to load popular activities.';
          return of([] as PopularActivityCard[]);
        }),

        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (activities) => {
          this.popularActivities = activities;

          if (!this.popularActivities.length && !this.errorMessage) {
            this.errorMessage = 'No popular activities available right now.';
          }

          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Popular activities load error:', error);

          this.errorMessage = 'Failed to load popular activities.';
          this.popularActivities = [];
          this.cdr.detectChanges();
        },
      });
  }

  getActivityImage(activity: PopularActivityCard): string {
    return activity.imageUrl || '/Photo/Aswan.png';
  }

  formatDuration(duration?: number | null): string {
    if (!duration) return '--';

    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours} hours`;
    return `${minutes} minutes`;
  }

  formatPrice(activity: PopularActivityCard): string {
    const currency = activity.priceCurrency || 'USD';
    return `From $${activity.minPrice} ${currency}`;
  }

  formatRating(rating: number): string {
    return rating ? rating.toFixed(1) : '0.0';
  }
}