import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { STORED_KEYS } from '../../../../core/constants/Stored_keys';

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${STORED_KEYS.baseUrl}/admin/activities`;

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