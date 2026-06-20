import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { STORED_KEYS } from '../../../../core/constants/Stored_keys';

import {
  ActivityViewsReportItem,
  UserGrowthReportItem,
  ActivitiesByCategoryReportItem,
  TopActivityReportItem,
} from './report';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${STORED_KEYS.baseUrl}/reports`;

  getActivityViewsReport() {
    return this.http.get<ActivityViewsReportItem[]>(
      `${this.baseUrl}/activity-views`
    );
  }

  getUserGrowthReport() {
    return this.http.get<UserGrowthReportItem[]>(
      `${this.baseUrl}/user-growth`
    );
  }

  getActivitiesByCategoryReport() {
    return this.http.get<ActivitiesByCategoryReportItem[]>(
      `${this.baseUrl}/activities-by-category`
    );
  }

  getTopActivitiesReport() {
    return this.http.get<TopActivityReportItem[]>(
      `${this.baseUrl}/top-activities`
    );
  }

  getAllReports() {
    return forkJoin({
      activityViews: this.getActivityViewsReport(),
      userGrowth: this.getUserGrowthReport(),
      activitiesByCategory: this.getActivitiesByCategoryReport(),
      topActivities: this.getTopActivitiesReport(),
    });
  }
}