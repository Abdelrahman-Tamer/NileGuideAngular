import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { STORED_KEYS } from '../../core/constants/Stored_keys';
import { ScheduleItemResponse, ScheduleResponse } from './schedule.interfaces';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${STORED_KEYS.baseUrl}/plan`;

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem(STORED_KEYS.USER_TOKEN) ?? '';

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getSchedule() {
    return this.http.get<ScheduleResponse>(this.baseUrl, {
      headers: this.getAuthHeaders(),
    });
  }

  addToSchedule(payload: {
    activityId: number;
    scheduledDate: string;
    startTime: string;
  }) {
    return this.http.post<ScheduleItemResponse>(
      `${this.baseUrl}/items`,
      payload,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  removeFromSchedule(planItemId: number) {
    return this.http.delete<void>(`${this.baseUrl}/items/${planItemId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  getScheduledActivityIds() {
    return this.http.get<number[]>(`${this.baseUrl}/activity-ids`, {
      headers: this.getAuthHeaders(),
    });
  }
}