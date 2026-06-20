export interface UserProfileResponse {
  userId: number;
  fullName: string;
  email: string;
  nationality: string | null;
  dateOfBirth: string | null;

  profile_picture_url?: string | null;
  profilePictureUrl?: string | null;

  hasTravelDates: boolean;
  travelStartDate: string | null;
  travelEndDate: string | null;

  preferredCityIds: number[];
  interestCategoryIds: number[];

  // سايبينه optional عشان لو راجع من الـ API ما يعملش مشكلة
  budgetLevel?: string | null;
}

export interface UpdateUserProfileRequest {
  fullName: string;
  email: string;
  nationality: string;
  dateOfBirth: string | null;

  hasTravelDates: boolean;
  travelStartDate: string | null;
  travelEndDate: string | null;

  preferredCityIds: number[];
  interestCategoryIds: number[];
}

export interface LookupItem {
  id: number;
  name: string;
}

export interface ProfilePictureResponse {
  profile_picture_url?: string;
  profilePictureUrl?: string;
  imageUrl?: string;
  url?: string;
  message?: string;
}