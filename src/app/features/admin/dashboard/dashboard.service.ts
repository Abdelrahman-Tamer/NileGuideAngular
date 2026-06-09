import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { STORED_KEYS } from '../../../core/constants/Stored_keys';
import { DashboardStatsResponse } from './dashboard';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${STORED_KEYS.baseUrl}/dashboard`;

  getDashboardStats() {
    return this.http.get<DashboardStatsResponse>(this.baseUrl);
  }
}