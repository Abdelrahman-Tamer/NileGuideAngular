import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { STORED_KEYS } from '../../../../core/constants/Stored_keys';

import {
  CreateUserRole,
  GetUsersPayload,
  UserItem,
  UsersResponse,
} from './users';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${STORED_KEYS.baseUrl}/users`;

  getUsers(payload: GetUsersPayload) {
    let params = new HttpParams();

    if (payload.search) {
      params = params.set('search', payload.search);
    }

    if (payload.role && payload.role !== 'all') {
      params = params.set('role', payload.role);
    }

    if (payload.isActive !== undefined) {
      params = params.set('isActive', payload.isActive);
    }

    params = params.set('page', payload.page ?? 1);
    params = params.set('pageSize', payload.pageSize ?? 10);

    return this.http.get<UsersResponse>(this.baseUrl, { params });
  }

  getUserById(id: number) {
    return this.http.get<UserItem>(`${this.baseUrl}/${id}`);
  }

  createUser(payload: FormData) {
    return this.http.post(this.baseUrl, payload, {
      responseType: 'text',
    });
  }

  uploadMyProfilePicture(file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post(`${this.baseUrl}/me/profile-picture`, formData, {
      responseType: 'text',
    });
  }

  deleteUser(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`, {
      responseType: 'text',
    });
  }

  updateUserRole(id: number, role: CreateUserRole) {
    return this.http.patch(
      `${this.baseUrl}/${id}/role`,
      { role },
      {
        responseType: 'text',
      }
    );
  }

  updateUserActiveStatus(id: number, isActive: boolean) {
    return this.http.patch(
      `${this.baseUrl}/${id}/status`,
      { isActive },
      {
        responseType: 'text',
      }
    );
  }
}