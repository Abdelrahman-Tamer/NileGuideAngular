export interface ActivityProvider {
  providerName: string;
  link: string;
}

export interface ActivityOpeningHour {
  day: string;
  openHour: number;
  openAmPm: string;
  closeHour: number;
  closeAmPm: string;
  openTime: string;
  closeTime: string;
}

export interface ActivityListItem {
  activityID: number;
  activityName: string;
  description: string;
  categoryID: number;
  categoryName: string;
  cityID: number;
  cityName: string;
  minPrice: number;
  priceCurrency: string;
  imageUrl: string;
  requiredDocuments: string;
  isActive: boolean;
  rating: number;
  reviewsCount: number;
  providers: ActivityProvider[];
  openingHours: ActivityOpeningHour[];
}

export interface ActivityDetails {
  activityID: number;
  activityName: string;
  description: string;
  categoryID: number;
  categoryName: string;
  cityID: number;
  cityName: string;
  latitude: number;
  longitude: number;
  price: number;
  minPrice: number;
  priceCurrency: string;
  priceBasis: string;
  duration: number;
  groupSize: string;
  cancellation: string;
  requiredDocuments: string;
  isActive: boolean;
  images: string[];
  providers: ActivityProvider[];
  openingHours: ActivityOpeningHour[];
}

export interface ActivityReview {
  reviewId: number;
  reviewerName: string;
  reviewerCity: string;
  rating: number;
  comment: string;
  createdAtUtc: string;
}

export interface CreateActivityReviewPayload {
  reviewerCity: string;
  rating: number;
  comment: string;
}

export interface ActivitiesResponse {
  totalCount: number;
  page: number;
  pageSize: number;
  items: ActivityListItem[];
}

export interface ActivityCategory {
  categoryID: number;
  categoryName: string;
}

export interface ActivityCity {
  cityID: number;
  cityName: string;
}

export type ActivitySortBy =
  | 'default'
  | 'priceLowToHigh'
  | 'priceHighToLow';