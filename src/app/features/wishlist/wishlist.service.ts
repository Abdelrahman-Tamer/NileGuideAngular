import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';

import { STORED_KEYS } from '../../core/constants/Stored_keys';
import {
  WishlistMessageResponse,
  WishlistPagedResponse,
  WishlistStatusResponse,
} from './wishlist.interfaces';
import { ActivityListItem } from '../activities/activities.interfaces';

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly baseUrl = `${STORED_KEYS.baseUrl}/wishlist`;
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private getAuthHeaders(): HttpHeaders {
    if (!this.isBrowser) {
      return new HttpHeaders();
    }

    const token = localStorage.getItem(STORED_KEYS.USER_TOKEN) ?? '';

    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getWishlist(page = 1, pageSize = 9) {
    if (!this.isBrowser) {
      return of({
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
      } as WishlistPagedResponse<ActivityListItem>);
    }

    const params = new HttpParams()
      .set('Page', page)
      .set('PageSize', pageSize);

    return this.http.get<WishlistPagedResponse<ActivityListItem>>(this.baseUrl, {
      params,
      headers: this.getAuthHeaders(),
    });
  }

  getWishlistedIds() {
    if (!this.isBrowser) {
      return of([]);
    }

    return this.http.get<number[]>(`${this.baseUrl}/activity-ids`, {
      headers: this.getAuthHeaders(),
    });
  }

  addToWishlist(activityId: number) {
    return this.http.post<WishlistMessageResponse>(
      `${this.baseUrl}/${activityId}`,
      {},
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  removeFromWishlist(activityId: number) {
    return this.http.delete<WishlistMessageResponse>(
      `${this.baseUrl}/${activityId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  getWishlistStatus(activityId: number) {
    if (!this.isBrowser) {
      return of({
        isWishlisted: false,
      } as WishlistStatusResponse);
    }

    return this.http.get<WishlistStatusResponse>(
      `${this.baseUrl}/status/${activityId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }
}