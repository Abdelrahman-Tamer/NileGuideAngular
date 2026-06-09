import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  private readonly baseUrl = environment.BaseUrl.replace(/\/$/, '');

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

  uploadProfilePicture(file: File): Observable<ProfilePictureResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // لو عندك endpoint مختلفة لرفع الصورة ابعتهالي أظبطها
    return this.http.post<ProfilePictureResponse>(
      `${this.baseUrl}/users/me/profile-picture`,
      formData
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