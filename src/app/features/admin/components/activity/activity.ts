export interface AdminActivitiesResponse {
  totalCount: number;
  page: number;
  pageSize: number;
  items: AdminActivityItem[];
}

export interface AdminActivityItem {
  activityId: number;
  activityName: string;
  description: string;

  categoryId: number;
  categoryName: string;

  cityId: number;
  cityName: string;

  price: number;
  minPrice?: number | null;
  priceCurrency: string;
  priceBasis?: string | null;

  duration: number;
  groupSize: string;

  cancellation?: string | null;
  requiredDocuments?: string | null;

  provider?: string | null;
  externalId?: string | null;
  region?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  rating: number;
  reviewCount: number;

  isActive: boolean;

  images: AdminActivityImage[];
  bookingLinks: AdminBookingLink[];
  activityHours: AdminActivityHour[];
}

export interface AdminActivityImage {
  imageId: number;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface AdminBookingLink {
  bookingLinkId?: number;
  provider: string;
  url: string;
}

export interface AdminActivityHour {
  activityHourId?: number;
  openHour: number;
  openAmPm: 'AM' | 'PM';
  closeHour: number;
  closeAmPm: 'AM' | 'PM';
  openTime?: string;
  closeTime?: string;
}

export interface GetAdminActivitiesPayload {
  categoryIds?: number[];
  cityIds?: number[];
  search?: string;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminActivityCategory {
  categoryID: number;
  categoryName: string;
}

export interface AdminActivityCity {
  cityID: number;
  cityName: string;
}