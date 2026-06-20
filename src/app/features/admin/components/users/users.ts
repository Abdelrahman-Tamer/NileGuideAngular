export interface GetUsersPayload {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface UsersResponse {
  totalCount: number;
  page: number;
  pageSize: number;
  items: UserItem[];
}

export interface UserItem {
  id: number;
  fullName: string;
  email: string;
  role: 'Admin' | 'Tourist' | 'User';
  joined: string;
  wishlistItems: number;
  isActive: boolean;
  profilePictureUrl: string | null;
}

export type CreateUserRole = 'Admin' | 'User';

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  nationality: string;
  dateOfBirth: string;
  role: CreateUserRole;
  isActive: boolean;
  profilePictureUrl: string | null;
}