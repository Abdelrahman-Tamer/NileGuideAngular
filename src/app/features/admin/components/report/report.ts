export interface ActivityViewsReportItem {
  day: string;
  views: number;
}

export interface UserGrowthReportItem {
  month: string;
  count: number;
}

export interface ActivitiesByCategoryReportItem {
  category: string;
  count: number;
}

export interface TopActivityReportItem {
  activityId: number;
  activityName: string;
  value: number;
}