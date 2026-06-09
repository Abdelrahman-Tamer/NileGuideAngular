import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, Subscription } from 'rxjs';

import { DashboardService } from './dashboard.service';
import { DashboardStatsResponse } from './dashboard';

type DashboardCard = {
  title: string;
  value: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
};

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);
  private readonly platformId = inject(PLATFORM_ID);

  private routerSub?: Subscription;
  private savedScrollY = 0;

  isLoading = signal(false);
  errorMessage = signal('');

  stats = signal<DashboardStatsResponse>({
    totalUsers: 0,
    totalActivities: 0,
    totalReviews: 0,
    wishlistItems: 0,
    averageRating: 0,
  });

  cards = computed<DashboardCard[]>(() => {
    const data = this.stats();

    return [
      {
        title: 'Total Users',
        value: data.totalUsers.toLocaleString(),
        icon: 'fa-solid fa-users',
        iconBg: 'bg-green-500/20',
        iconColor: 'text-green-400',
        badge: '+12%',
        badgeBg: 'bg-green-500/20',
        badgeColor: 'text-green-400',
      },
      {
        title: 'Total Activities',
        value: data.totalActivities.toLocaleString(),
        icon: 'fa-solid fa-ticket',
        iconBg: 'bg-orange-500/20',
        iconColor: 'text-orange-400',
        badge: '+8%',
        badgeBg: 'bg-blue-500/20',
        badgeColor: 'text-blue-400',
      },
      {
        title: 'Total Reviews',
        value: data.totalReviews.toLocaleString(),
        icon: 'fa-solid fa-message',
        iconBg: 'bg-purple-500/20',
        iconColor: 'text-purple-400',
        badge: '+24%',
        badgeBg: 'bg-purple-500/20',
        badgeColor: 'text-purple-400',
      },
      {
        title: 'Wishlist Items',
        value: data.wishlistItems.toLocaleString(),
        icon: 'fa-regular fa-heart',
        iconBg: 'bg-red-500/20',
        iconColor: 'text-red-400',
        badge: '+18%',
        badgeBg: 'bg-red-500/20',
        badgeColor: 'text-red-400',
      },
      {
        title: 'Average Rating',
        value: data.averageRating.toFixed(1),
        icon: 'fa-solid fa-star',
        iconBg: 'bg-yellow-500/20',
        iconColor: 'text-yellow-400',
        badge: '+0.2',
        badgeBg: 'bg-yellow-500/20',
        badgeColor: 'text-yellow-400',
      },
    ];
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadDashboardStats();
    this.handleDashboardScroll();
  }

  loadDashboardStats(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.dashboardService.getDashboardStats().subscribe({
      next: (res) => {
        this.stats.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
        this.errorMessage.set('Failed to load dashboard statistics');
        this.isLoading.set(false);
      },
    });
  }

  private handleDashboardScroll(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.routerSub = this.router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationStart || event instanceof NavigationEnd
        )
      )
      .subscribe((event) => {
        const currentUrl = this.router.url;

        const isInsideDashboard =
          currentUrl.startsWith('/dashboard') ||
          (event instanceof NavigationStart &&
            event.url.startsWith('/dashboard'));

        if (!isInsideDashboard) return;

        if (event instanceof NavigationStart) {
          this.savedScrollY = window.scrollY;
        }

        if (event instanceof NavigationEnd) {
          setTimeout(() => {
            window.scrollTo(0, this.savedScrollY);
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
} 