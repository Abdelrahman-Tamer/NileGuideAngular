export interface WishlistPagedResponse<T> {
  totalCount: number;
  page: number;
  pageSize: number;
  items: T[];
}

export interface WishlistIdsResponse extends Array<number> {}

export interface WishlistMessageResponse {
  message: string;
}

export interface WishlistStatusResponse {
  activityID: number;
  isWishlisted: boolean;
}