import {
  ChangeDetectorRef,
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';

import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReportsService } from './report.service';

import {
  ActivityViewsReportItem,
  UserGrowthReportItem,
  ActivitiesByCategoryReportItem,
  TopActivityReportItem,
} from './report';

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

interface AxisTick {
  label: string;
  position: number;
}

interface CategoryLegendItem {
  name: string;
  count: number;
  color: string;
  percent: number;
}

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report.component.html',
  styleUrl: './report.component.css',
})
export class ReportComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  loading = false;
  reportsReady = false;
  errorMessage = '';

  activityViews: ActivityViewsReportItem[] = [];
  userGrowth: UserGrowthReportItem[] = [];
  activitiesByCategory: ActivitiesByCategoryReportItem[] = [];
  topActivities: TopActivityReportItem[] = [];

  activityViewsLabels: string[] = [];
  activityViewsValues: number[] = [];

  userGrowthLabels: string[] = [];
  userGrowthValues: number[] = [];

  categoryLabels: string[] = [];
  categoryValues: number[] = [];

  activityPoints: ChartPoint[] = [];
  activityLinePath = '';
  activityAreaPath = '';
  activityAxisTicks: AxisTick[] = [];

  userGrowthAxisTicks: AxisTick[] = [];
  userGrowthMaxValue = 5;

  categoryLegend: CategoryLegendItem[] = [];
  categoryChartBackground = 'conic-gradient(#e0b100 0deg 360deg)';

  topActivitiesMaxValue = 0;

  private requestId = 0;

  private readonly categoryColors = [
    '#e0b100',
    '#d4af37',
    '#b97832',
    '#8f6c17',
    '#6d570f',
    '#c8943b',
    '#a88622',
    '#7d6518',
    '#bfa64a',
    '#5f4b0d',
  ];

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.loadReports();
  }

  loadReports(): void {
    if (!this.isBrowser) {
      return;
    }

    const currentRequestId = ++this.requestId;

    this.loading = true;
    this.reportsReady = false;
    this.errorMessage = '';

    this.resetReportData();

    this.cdr.detectChanges();

    this.reportsService.getAllReports().subscribe({
      next: (res) => {
        if (currentRequestId !== this.requestId) {
          return;
        }

        this.activityViews = [...(res.activityViews ?? [])];
        this.userGrowth = [...(res.userGrowth ?? [])];
        this.activitiesByCategory = [...(res.activitiesByCategory ?? [])];
        this.topActivities = [...(res.topActivities ?? [])];

        this.prepareReportData();

        this.loading = false;
        this.errorMessage = '';
        this.reportsReady = true;

        this.cdr.detectChanges();
      },
      error: (err) => {
        if (currentRequestId !== this.requestId) {
          return;
        }

        console.error('Error loading reports:', {
          status: err?.status,
          statusText: err?.statusText,
          url: err?.url,
          message: err?.message,
          error: err?.error,
        });

        this.resetReportData();

        this.errorMessage = 'Failed to load reports data';
        this.loading = false;
        this.reportsReady = true;

        this.cdr.detectChanges();
      },
    });
  }

  printReport(): void {
    if (!this.isBrowser) {
      return;
    }

    window.print();
  }

  private resetReportData(): void {
    this.activityViews = [];
    this.userGrowth = [];
    this.activitiesByCategory = [];
    this.topActivities = [];

    this.activityViewsLabels = [];
    this.activityViewsValues = [];

    this.userGrowthLabels = [];
    this.userGrowthValues = [];

    this.categoryLabels = [];
    this.categoryValues = [];

    this.activityPoints = [];
    this.activityLinePath = '';
    this.activityAreaPath = '';
    this.activityAxisTicks = [];

    this.userGrowthAxisTicks = [];
    this.userGrowthMaxValue = 5;

    this.categoryLegend = [];
    this.categoryChartBackground = 'conic-gradient(#e0b100 0deg 360deg)';

    this.topActivitiesMaxValue = 0;
  }

  private prepareReportData(): void {
    this.prepareChartData();
    this.prepareActivityViewsChart();
    this.prepareUserGrowthChart();
    this.prepareCategoryChart();
    this.prepareTopActivities();
  }

  private prepareChartData(): void {
    this.activityViewsLabels = this.activityViews.map((item) => item.day);
    this.activityViewsValues = this.activityViews.map((item) => item.views);

    this.userGrowthLabels = this.userGrowth.map((item) => item.month);
    this.userGrowthValues = this.userGrowth.map((item) => item.count);

    this.categoryLabels = this.activitiesByCategory.map((item) => item.category);
    this.categoryValues = this.activitiesByCategory.map((item) => item.count);
  }

  private prepareActivityViewsChart(): void {
    const maxValue = this.getNiceMax(this.activityViewsValues, 5);
    this.activityAxisTicks = this.createAxisTicks(maxValue, 5);

    if (!this.activityViews.length) {
      this.activityPoints = [];
      this.activityLinePath = '';
      this.activityAreaPath = '';
      return;
    }

    this.activityPoints = this.activityViews.map((item, index) => {
      const x =
        this.activityViews.length === 1
          ? 50
          : (index / (this.activityViews.length - 1)) * 100;

      const y = 100 - (item.views / maxValue) * 100;

      return {
        x,
        y: Math.min(100, Math.max(0, y)),
        value: item.views,
        label: item.day,
      };
    });

    this.activityLinePath = this.pointsToPath(this.activityPoints);

    this.activityAreaPath = this.activityLinePath
      ? `${this.activityLinePath} L 100 100 L 0 100 Z`
      : '';
  }

  private prepareUserGrowthChart(): void {
    this.userGrowthMaxValue = this.getNiceMax(this.userGrowthValues, 5);
    this.userGrowthAxisTicks = this.createAxisTicks(this.userGrowthMaxValue, 4);
  }

  private prepareCategoryChart(): void {
    const sortedCategories = [...this.activitiesByCategory].sort(
      (a, b) => b.count - a.count
    );

    const topCategories = sortedCategories.slice(0, 5);
    const otherCategories = sortedCategories.slice(5);

    const othersCount = otherCategories.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const chartItems =
      othersCount > 0
        ? [
            ...topCategories,
            {
              category: 'Others',
              count: othersCount,
            },
          ]
        : topCategories;

    const total = chartItems.reduce((sum, item) => sum + item.count, 0);

    if (!chartItems.length || total === 0) {
      this.categoryLegend = [];
      this.categoryChartBackground = 'conic-gradient(#e0b100 0deg 360deg)';
      return;
    }

    let startDegree = 0;

    const gradientParts = chartItems.map((item, index) => {
      const color = this.categoryColors[index % this.categoryColors.length];
      const degree = (item.count / total) * 360;
      const endDegree = startDegree + degree;

      const part = `${color} ${startDegree}deg ${endDegree}deg`;
      startDegree = endDegree;

      return part;
    });

    this.categoryChartBackground = `conic-gradient(${gradientParts.join(', ')})`;

    this.categoryLegend = chartItems.map((item, index) => ({
      name: item.category,
      count: item.count,
      color: this.categoryColors[index % this.categoryColors.length],
      percent: Math.round((item.count / total) * 100),
    }));
  }

  private prepareTopActivities(): void {
    this.topActivitiesMaxValue = Math.max(
      ...this.topActivities.map((item) => item.value),
      0
    );
  }

  getUserGrowthBarHeight(value: number): number {
    if (!this.userGrowthMaxValue || value <= 0) {
      return 2;
    }

    return Math.max(4, (value / this.userGrowthMaxValue) * 100);
  }

  getTopActivityWidth(value: number): number {
    if (!this.topActivitiesMaxValue || value <= 0) {
      return 0;
    }

    return Math.max(4, (value / this.topActivitiesMaxValue) * 100);
  }

  formatNumber(value: number): string {
    return Math.round(value).toLocaleString('en-US');
  }

  private pointsToPath(points: ChartPoint[]): string {
    if (!points.length) {
      return '';
    }

    return points
      .map((point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${command} ${point.x} ${point.y}`;
      })
      .join(' ');
  }

  private createAxisTicks(maxValue: number, steps: number): AxisTick[] {
    return Array.from({ length: steps + 1 }, (_, index) => {
      const value = maxValue - (maxValue / steps) * index;

      return {
        label: this.formatNumber(value),
        position: (index / steps) * 100,
      };
    });
  }

  private getNiceMax(values: number[], fallback: number): number {
    const max = Math.max(...values, 0);

    if (max <= 0) {
      return fallback;
    }

    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const normalized = max / magnitude;

    let niceNormalized = 1;

    if (normalized <= 1) {
      niceNormalized = 1;
    } else if (normalized <= 2) {
      niceNormalized = 2;
    } else if (normalized <= 5) {
      niceNormalized = 5;
    } else {
      niceNormalized = 10;
    }

    return niceNormalized * magnitude;
  }
}