import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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
  private readonly baseUrl = `${STORED_KEYS.baseUrl}/wishlist`;

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem(STORED_KEYS.USER_TOKEN) ?? '';

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getWishlist(page = 1, pageSize = 9) {
    const params = new HttpParams()
      .set('Page', page)
      .set('PageSize', pageSize);

    return this.http.get<WishlistPagedResponse<ActivityListItem>>(this.baseUrl, {
      params,
      headers: this.getAuthHeaders(),
    });
  }

  getWishlistedIds() {
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
    return this.http.get<WishlistStatusResponse>(
      `${this.baseUrl}/status/${activityId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }
}