import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { STORED_KEYS } from '../../core/constants/Stored_keys';

import {
  ActivitiesResponse,
  ActivityCategory,
  ActivityCity,
  ActivitySortBy,
  ActivityDetails,
} from './activities.interfaces';

@Injectable({
  providedIn: 'root',
})
export class ActivitiesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = STORED_KEYS.baseUrl + '/Activities';
  private readonly categoriesUrl = STORED_KEYS.baseUrl + '/Categories';
  private readonly citiesUrl = STORED_KEYS.baseUrl + '/Cities';

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

  getCategories() {
    return this.http.get<ActivityCategory[]>(this.categoriesUrl);
  }

  getCities() {
    return this.http.get<ActivityCity[]>(this.citiesUrl);
  }
}