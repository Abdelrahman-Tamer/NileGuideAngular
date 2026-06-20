import { Injectable } from '@angular/core';
import {
  ActivityCategory,
  ActivityCity,
  ActivityListItem,
  ActivitySortBy,
} from './activities.interfaces';

export interface ActivitiesPageState {
  activities: ActivityListItem[];
  categories: ActivityCategory[];
  cities: ActivityCity[];

  selectedCategoryIds: number[];
  selectedCityIds: number[];

  searchTerm: string;
  sortBy: ActivitySortBy;

  totalCount: number;
  currentPage: number;
  pageSize: number;

  scrollY: number;
  savedAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class ActivitiesStateService {
  private readonly storageKey = 'nileguide_activities_page_state';
  private readonly maxAge = 10 * 60 * 1000; // 10 minutes

  getState(): ActivitiesPageState | null {
    if (!this.canUseStorage()) return null;

    const raw = sessionStorage.getItem(this.storageKey);

    if (!raw) return null;

    try {
      const state = JSON.parse(raw) as ActivitiesPageState;

      if (!state.savedAt || Date.now() - state.savedAt > this.maxAge) {
        this.clearState();
        return null;
      }

      return state;
    } catch {
      this.clearState();
      return null;
    }
  }

  saveState(state: Omit<ActivitiesPageState, 'savedAt'>): void {
    if (!this.canUseStorage()) return;

    sessionStorage.setItem(
      this.storageKey,
      JSON.stringify({
        ...state,
        savedAt: Date.now(),
      })
    );
  }

  clearState(): void {
    if (!this.canUseStorage()) return;

    sessionStorage.removeItem(this.storageKey);
  }

  private canUseStorage(): boolean {
    return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
  }
}