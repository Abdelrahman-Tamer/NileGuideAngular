import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { STORED_KEYS } from '../../../../core/constants/Stored_keys';

import {
  AdminActivitiesResponse,
  AdminActivityCategory,
  AdminActivityCity,
  GetAdminActivitiesPayload,
} from './activity';

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${STORED_KEYS.baseUrl}/admin/activities`;
  private readonly categoriesUrl = `${STORED_KEYS.baseUrl}/Categories`;
  private readonly citiesUrl = `${STORED_KEYS.baseUrl}/Cities`;

  getAdminActivities(payload: GetAdminActivitiesPayload) {
    let params = new HttpParams();

    if (payload.categoryIds?.length) {
      payload.categoryIds.forEach((id) => {
        params = params.append('CategoryIds', String(id));
      });
    }

    if (payload.cityIds?.length) {
      payload.cityIds.forEach((id) => {
        params = params.append('CityIds', String(id));
      });
    }

    if (payload.search?.trim()) {
      params = params.set('Search', payload.search.trim());
    }

    if (payload.sortBy) {
      params = params.set('SortBy', payload.sortBy);
    }

    params = params.set('Page', String(payload.page ?? 1));
    params = params.set('PageSize', String(payload.pageSize ?? 10));

    return this.http.get<AdminActivitiesResponse>(this.baseUrl, { params });
  }

  getCategories() {
    return this.http.get<AdminActivityCategory[]>(this.categoriesUrl);
  }

  getCities() {
    return this.http.get<AdminActivityCity[]>(this.citiesUrl);
  }

  createActivity(payload: FormData) {
    return this.http.post(this.baseUrl, payload, {
      responseType: 'text',
    });
  }

  updateActivity(activityId: number, payload: FormData) {
    return this.http.put(`${this.baseUrl}/${activityId}`, payload, {
      responseType: 'text',
    });
  }

  deleteActivity(activityId: number) {
    return this.http.delete(`${this.baseUrl}/${activityId}`, {
      responseType: 'text',
    });
  }
}