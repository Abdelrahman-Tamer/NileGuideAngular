import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { STORED_KEYS } from '../../core/constants/Stored_keys';

import {
  LookupItem,
  ProfilePictureResponse,
  UpdateUserProfileRequest,
  UserProfileResponse
} from './profile';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly baseUrl = STORED_KEYS.baseUrl.replace(/\/$/, '');

  // GET /api/users/me/profile
  // PUT /api/users/me/profile
  private readonly profileUrl = `${this.baseUrl}/users/me/profile`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(this.profileUrl);
  }

  updateProfile(payload: UpdateUserProfileRequest): Observable<UserProfileResponse> {
    return this.http.put<UserProfileResponse>(this.profileUrl, payload);
  }

  // POST /api/users/me/profile-picture
  // form-data key: Image
  uploadProfilePicture(file: File): Observable<ProfilePictureResponse> {
    const formData = new FormData();

    // الـ backend عندك مستني Image مش file
    formData.append('Image', file, file.name);

    return this.http.post<ProfilePictureResponse>(
      `${this.baseUrl}/users/me/profile-picture`,
      formData
    );
  }

  // DELETE /api/users/me/profile-picture
  deleteProfilePicture(): Observable<{ message?: string }> {
    return this.http.delete<{ message?: string }>(
      `${this.baseUrl}/users/me/profile-picture`
    );
  }

  getCities(): Observable<LookupItem[]> {
    return this.http.get<any>(`${this.baseUrl}/cities`).pipe(
      map((response) => this.normalizeLookupList(response, 'city'))
    );
  }

  getInterestCategories(): Observable<LookupItem[]> {
    return this.http.get<any>(`${this.baseUrl}/categories`).pipe(
      map((response) => this.normalizeLookupList(response, 'category'))
    );
  }

  resolveFileUrl(fileUrl: string | null | undefined): string {
    const value = String(fileUrl || '').trim();

    if (!value) {
      return '';
    }

    if (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('data:') ||
      value.startsWith('blob:')
    ) {
      return value;
    }

    const apiOrigin = this.baseUrl.replace(/\/api$/i, '');

    if (value.startsWith('/')) {
      return `${apiOrigin}${value}`;
    }

    return `${apiOrigin}/${value}`;
  }

  private normalizeLookupList(response: any, type: 'city' | 'category'): LookupItem[] {
    const list = Array.isArray(response)
      ? response
      : response?.items ??
        response?.data ??
        response?.cities ??
        response?.categories ??
        [];

    if (!Array.isArray(list)) {
      return [];
    }

    return list
      .map((item: any) => {
        const id =
          item.id ??
          item.cityId ??
          item.cityID ??
          item.categoryId ??
          item.categoryID ??
          item[`${type}Id`] ??
          0;

        const name =
          item.name ??
          item.cityName ??
          item.categoryName ??
          item.title ??
          '';

        return {
          id: Number(id),
          name: String(name)
        };
      })
      .filter((item: LookupItem) => item.id > 0 && item.name.trim().length > 0);
  }
}