export interface ScheduleBookingLink {
  providerName: string;
  link: string;
}

export interface ScheduleItemResponse {
  planItemId: number;
  activityId: number;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  activityName: string;
  description: string;
  cityId: number;
  cityName: string;
  durationMinutes: number;
  price: number;
  priceCurrency: string;
  isActive: boolean;
  bookingLinks: ScheduleBookingLink[];
}

export interface ScheduleResponse {
  totalActivities: number;
  totalCost: number;
  priceCurrency: string;
  items: ScheduleItemResponse[];
}

export interface ScheduleItem extends ScheduleItemResponse {
  openTime?: string;
  closeTime?: string;
}