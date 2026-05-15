import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { STORED_KEYS } from '../../core/constants/Stored_keys';

import {
  ActivitiesResponse,
  ActivityCategory,
  ActivityCity,
  ActivitySortBy,
  ActivityDetails,
  ActivityReview,
  CreateActivityReviewPayload,
} from './activities.interfaces';

@Injectable({
  providedIn: 'root',
})
export class ActivitiesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = STORED_KEYS.baseUrl + '/Activities';
  private readonly categoriesUrl = STORED_KEYS.baseUrl + '/Categories';
  private readonly citiesUrl = STORED_KEYS.baseUrl + '/Cities';

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem(STORED_KEYS.USER_TOKEN) ?? '';

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getActivities(payload: {
    categoryIds?: number[];
    cityIds?: number[];
    search?: string;
    sortBy?: ActivitySortBy;
    page?: number;
    pageSize?: number;
  }) {
    let params = new HttpParams();

    if (payload.categoryIds?.length) {
      payload.categoryIds.forEach((id) => {
        params = params.append('CategoryIds', id);
      });
    }

    if (payload.cityIds?.length) {
      payload.cityIds.forEach((id) => {
        params = params.append('CityIds', id);
      });
    }

    if (payload.search?.trim()) {
      params = params.set('Search', payload.search.trim());
    }

    if (payload.sortBy) {
      params = params.set('SortBy', payload.sortBy);
    }

    params = params.set('Page', payload.page ?? 1);
    params = params.set('PageSize', payload.pageSize ?? 9);

    return this.http.get<ActivitiesResponse>(this.baseUrl, { params });
  }

  getActivityById(activityId: number) {
    return this.http.get<ActivityDetails>(`${this.baseUrl}/${activityId}`);
  }

  getActivityReviews(activityId: number) {
    return this.http.get<ActivityReview[]>(`${this.baseUrl}/${activityId}/reviews`);
  }

  createActivityReview(
    activityId: number,
    payload: CreateActivityReviewPayload
  ) {
    return this.http.post<ActivityReview>(
      `${this.baseUrl}/${activityId}/reviews`,
      payload,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  getCategories() {
    return this.http.get<ActivityCategory[]>(this.categoriesUrl);
  }

  getCities() {
    return this.http.get<ActivityCity[]>(this.citiesUrl);
  }
}