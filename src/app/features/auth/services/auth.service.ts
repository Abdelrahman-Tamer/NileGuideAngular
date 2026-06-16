import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { STORED_KEYS } from '../../../core/constants/Stored_keys';

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  nationality: string;
  dateOfBirth: string;
}

export interface RegisterResponse {
  token: string;
  expiresAtUtc: string;
  userId: number;
  role: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAtUtc?: string;
  userId?: number;
  role?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = STORED_KEYS.baseUrl + '/auth';

  register(payload: RegisterPayload) {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, payload);
  }

  login(payload: LoginPayload) {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload);
  }

  saveAuth(token: string, userId?: number, role?: string): void {
    const cleanToken = token.replace(/^"|"$/g, '');
    const resolvedRole = role || this.getRoleFromToken(cleanToken);

    localStorage.setItem(STORED_KEYS.USER_TOKEN, cleanToken);

    if (userId !== undefined && userId !== null) {
      localStorage.setItem(STORED_KEYS.USER_ID, String(userId));
    }

    if (resolvedRole) {
      localStorage.setItem(STORED_KEYS.USER_ROLE, resolvedRole);
    }
  }

  clearAuth(): void {
    localStorage.removeItem(STORED_KEYS.USER_TOKEN);
    localStorage.removeItem(STORED_KEYS.USER_ID);
    localStorage.removeItem(STORED_KEYS.USER_ROLE);
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;

    const token = localStorage.getItem(STORED_KEYS.USER_TOKEN);
    return token ? token.replace(/^"|"$/g, '') : null;
  }

  getRole(): string | null {
    if (typeof localStorage === 'undefined') return null;

    const storedRole = localStorage.getItem(STORED_KEYS.USER_ROLE);

    if (storedRole) {
      return storedRole;
    }

    const token = this.getToken();
    const tokenRole = token ? this.getRoleFromToken(token) : null;

    if (tokenRole) {
      localStorage.setItem(STORED_KEYS.USER_ROLE, tokenRole);
    }

    return tokenRole;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isTourist(): boolean {
    return this.getRole()?.toLowerCase() === 'tourist';
  }

  isAdmin(): boolean {
    return this.getRole()?.toLowerCase() === 'admin';
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email });
  }

  verifyResetCode(payload: { email: string; code: string }) {
    return this.http.post<void>(`${this.baseUrl}/verify-reset-code`, payload);
  }

  resetPassword(payload: { email: string; code: string; newPassword: string }) {
    return this.http.post<void>(`${this.baseUrl}/reset-password`, payload);
  }

  private getRoleFromToken(token: string): string | null {
    try {
      const payload = token.split('.')[1];

      if (!payload) return null;

      const decoded = JSON.parse(atob(payload));

      return (
        decoded.role ||
        decoded.Role ||
        decoded[
          'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
        ] ||
        null
      );
    } catch {
      return null;
    }
  }
}