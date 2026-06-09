import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { ActivitiesService } from '../../../activities/activities.service';
import {
  ActivityCategory,
  ActivityCity,
  ActivityListItem,
} from '../../../activities/activities.interfaces';

import { ActivityService as AdminActivityService } from './activity.service';

type ActivityStatusFilter = 'all' | 'active' | 'inactive';
type ActivityFormMode = 'add' | 'edit';

@Component({
  selector: 'app-activity',
  imports: [ReactiveFormsModule],
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.css',
})
export class ActivityComponent implements OnInit, OnDestroy {
  activitySearch = '';

  selectedCategory = 'all';
  selectedCity = 'all';
  selectedStatus: ActivityStatusFilter = 'all';

  currentPage = 1;
  itemsPerPage = 10;
  totalCount = 0;

  readonly pageGroupSize = 3;
  readonly maxActivityImageSize = 5 * 1024 * 1024;

  isLoading = false;
  errorMessage = '';

  isAddActivityModalOpen = false;
  isSavingActivity = false;
  activityFormMode: ActivityFormMode = 'add';

  selectedActivity: ActivityListItem | null = null;
  selectedActivityId: number | null = null;

  selectedActivityImageFile: File | null = null;
  selectedActivityImagePreview: string | null = null;

  isViewActivityModalOpen = false;
  selectedViewActivity: ActivityListItem | null = null;

  isConfirmModalOpen = false;
  isConfirmLoading = false;
  confirmModalActivity: ActivityListItem | null = null;
  confirmModalTitle = '';
  confirmModalMessage = '';
  confirmModalButtonText = '';

  activities: ActivityListItem[] = [];
  filterCategories: ActivityCategory[] = [];
  filterCities: ActivityCity[] = [];

  searchTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;

  activityForm;

  constructor(
    private fb: FormBuilder,
    private activitiesService: ActivitiesService,
    private adminActivityService: AdminActivityService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {
    this.activityForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      category: ['', Validators.required],
      price: [null as number | null],
      location: ['', Validators.required],
      duration: [''],
      rating: [null as number | null],
      maxGroupSize: [null as number | null],
      status: ['Active' as 'Active' | 'Inactive'],
      imageUrl: [''],
    });
  }

  ngOnInit(): void {
    this.loadFilters();
    this.loadActivities();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.revokeSelectedActivityImagePreview();
  }

  loadFilters(): void {
    this.activitiesService.getCategories().subscribe({
      next: (categories) => {
        this.filterCategories = categories;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load categories', error);
      },
    });

    this.activitiesService.getCities().subscribe({
      next: (cities) => {
        this.filterCities = cities;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load cities', error);
      },
    });
  }

  loadActivities(): void {
    const currentRequestId = ++this.requestId;

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.activitiesService
      .getActivities({
        search: this.activitySearch?.trim() ?? '',
        categoryIds:
          this.selectedCategory === 'all'
            ? []
            : [Number(this.selectedCategory)],
        cityIds:
          this.selectedCity === 'all'
            ? []
            : [Number(this.selectedCity)],
        page: this.currentPage,
        pageSize: this.itemsPerPage,
        sortBy: 'default',
      })
      .subscribe({
        next: (response) => {
          if (currentRequestId !== this.requestId) {
            return;
          }

          this.activities = response.items ?? [];
          this.totalCount = response.totalCount;
          this.currentPage = response.page;
          this.itemsPerPage = response.pageSize;

          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (currentRequestId !== this.requestId) {
            return;
          }

          console.error('Failed to load activities', error);

          this.activities = [];
          this.totalCount = 0;
          this.errorMessage = 'Failed to load activities';
          this.isLoading = false;

          this.cdr.markForCheck();
        },
      });
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.itemsPerPage);
  }

  get paginatedActivities(): ActivityListItem[] {
    if (this.selectedStatus === 'active') {
      return this.activities.filter((activity) => activity.isActive);
    }

    if (this.selectedStatus === 'inactive') {
      return this.activities.filter((activity) => !activity.isActive);
    }

    return this.activities;
  }

  get pageGroupStart(): number {
    if (this.totalPages <= this.pageGroupSize) {
      return 1;
    }

    const normalGroupStart =
      Math.floor((this.currentPage - 1) / this.pageGroupSize) *
        this.pageGroupSize +
      1;

    const lastPossibleGroupStart = this.totalPages - this.pageGroupSize + 1;

    if (normalGroupStart + this.pageGroupSize - 1 > this.totalPages) {
      return lastPossibleGroupStart;
    }

    return normalGroupStart;
  }

  get pageGroupEnd(): number {
    return Math.min(
      this.pageGroupStart + this.pageGroupSize - 1,
      this.totalPages
    );
  }

  get visiblePages(): number[] {
    const pages: number[] = [];

    for (let page = this.pageGroupStart; page <= this.pageGroupEnd; page++) {
      pages.push(page);
    }

    return pages;
  }

  get canGoPreviousPageGroup(): boolean {
    return this.pageGroupStart > 1;
  }

  get canGoNextPageGroup(): boolean {
    return this.pageGroupEnd < this.totalPages;
  }

  previousPageGroup(): void {
    if (!this.canGoPreviousPageGroup) {
      return;
    }

    this.currentPage = this.pageGroupStart - 1;
    this.loadActivities();
  }

  nextPageGroup(): void {
    if (!this.canGoNextPageGroup) {
      return;
    }

    this.currentPage = this.pageGroupEnd + 1;
    this.loadActivities();
  }

  onSearchChange(value: string): void {
    this.activitySearch = value;

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadActivities();
    }, 300);
  }

  onCategoryChange(value: string): void {
    this.selectedCategory = value;
    this.currentPage = 1;
    this.loadActivities();
  }

  onCityChange(value: string): void {
    this.selectedCity = value;
    this.currentPage = 1;
    this.loadActivities();
  }

  onStatusChange(value: string): void {
    this.selectedStatus = value as ActivityStatusFilter;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.loadActivities();
  }

  get startItem(): number {
    if (this.totalCount === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalCount);
  }

  openAddActivityModal(): void {
    this.activityFormMode = 'add';
    this.selectedActivity = null;
    this.selectedActivityId = null;

    this.resetActivityForm();

    this.isAddActivityModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditActivityModal(activity: ActivityListItem): void {
    const activityId = this.getActivityId(activity);

    if (!activityId) {
      this.toastr.error('Invalid activity id');
      return;
    }

    this.activityFormMode = 'edit';
    this.selectedActivity = activity;
    this.selectedActivityId = activityId;

    this.revokeSelectedActivityImagePreview();

    this.selectedActivityImageFile = null;
    this.selectedActivityImagePreview = activity.imageUrl ?? null;

    this.activityForm.patchValue({
      name: activity.activityName ?? '',
      description: activity.description ?? '',
      category: activity.categoryName ?? '',
      price: activity.minPrice ?? null,
      location: activity.cityName ?? '',
      duration: '',
      rating: activity.rating ?? null,
      maxGroupSize: null,
      status: activity.isActive ? 'Active' : 'Inactive',
      imageUrl: activity.imageUrl ?? '',
    });

    this.isAddActivityModalOpen = true;
    this.cdr.markForCheck();
  }

  closeAddActivityModal(): void {
    if (this.isSavingActivity) {
      return;
    }

    this.isAddActivityModalOpen = false;
    this.activityFormMode = 'add';
    this.selectedActivity = null;
    this.selectedActivityId = null;

    this.resetActivityForm();
    this.cdr.markForCheck();
  }

  resetActivityForm(): void {
    this.activityForm.reset({
      name: '',
      description: '',
      category: '',
      price: null,
      location: '',
      duration: '',
      rating: null,
      maxGroupSize: null,
      status: 'Active',
      imageUrl: '',
    });

    this.selectedActivityImageFile = null;
    this.revokeSelectedActivityImagePreview();
    this.selectedActivityImagePreview = null;
  }

  onActivityImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toastr.error('Please select a valid image file');
      input.value = '';
      return;
    }

    if (file.size > this.maxActivityImageSize) {
      this.toastr.error('Image size must be less than 5MB');
      input.value = '';
      return;
    }

    this.revokeSelectedActivityImagePreview();

    this.selectedActivityImageFile = file;
    this.selectedActivityImagePreview = URL.createObjectURL(file);

    this.cdr.markForCheck();
  }

  removeSelectedActivityImage(input: HTMLInputElement): void {
    input.value = '';
    this.selectedActivityImageFile = null;

    this.revokeSelectedActivityImagePreview();

    if (this.activityFormMode === 'edit' && this.selectedActivity?.imageUrl) {
      this.selectedActivityImagePreview = this.selectedActivity.imageUrl;
      this.activityForm.patchValue({
        imageUrl: this.selectedActivity.imageUrl,
      });
    } else {
      this.selectedActivityImagePreview = null;
      this.activityForm.patchValue({
        imageUrl: '',
      });
    }

    this.cdr.markForCheck();
  }

  addActivity(): void {
    this.saveActivity();
  }

  saveActivity(): void {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      this.toastr.warning('Please fill all required fields');
      return;
    }

    if (this.activityFormMode === 'edit') {
      this.updateActivity();
      return;
    }

    this.createActivity();
  }

  private createActivity(): void {
    const formData = this.buildActivityFormData();

    this.isSavingActivity = true;
    this.cdr.markForCheck();

    this.adminActivityService.createActivity(formData).subscribe({
      next: () => {
        this.toastr.success('Activity created successfully');

        this.isSavingActivity = false;
        this.closeAddActivityModal();

        this.currentPage = 1;
        this.loadActivities();
      },
      error: (error) => {
        console.error('Create activity error:', error);

        this.toastr.error(
          this.getErrorMessage(error) || 'Failed to create activity'
        );

        this.isSavingActivity = false;
        this.cdr.markForCheck();
      },
    });
  }

  private updateActivity(): void {
    if (!this.selectedActivityId) {
      this.toastr.error('Invalid activity id');
      return;
    }

    const formData = this.buildActivityFormData();
    formData.append('activityId', String(this.selectedActivityId));

    this.isSavingActivity = true;
    this.cdr.markForCheck();

    this.adminActivityService
      .updateActivity(this.selectedActivityId, formData)
      .subscribe({
        next: () => {
          this.toastr.success('Activity updated successfully');

          this.isSavingActivity = false;
          this.closeAddActivityModal();

          this.loadActivities();
        },
        error: (error) => {
          console.error('Update activity error:', error);

          this.toastr.error(
            this.getErrorMessage(error) || 'Failed to update activity'
          );

          this.isSavingActivity = false;
          this.cdr.markForCheck();
        },
      });
  }

  deleteActivity(activity: ActivityListItem): void {
    this.confirmModalActivity = activity;
    this.confirmModalTitle = 'Delete Activity';
    this.confirmModalMessage = `Are you sure you want to delete "${activity.activityName}"?`;
    this.confirmModalButtonText = 'Yes, Delete';
    this.isConfirmModalOpen = true;
    this.cdr.markForCheck();
  }

  closeConfirmModal(): void {
    if (this.isConfirmLoading) {
      return;
    }

    this.isConfirmModalOpen = false;
    this.confirmModalActivity = null;
    this.confirmModalTitle = '';
    this.confirmModalMessage = '';
    this.confirmModalButtonText = '';

    this.cdr.markForCheck();
  }

  confirmAction(): void {
    if (!this.confirmModalActivity) {
      return;
    }

    const activityId = this.getActivityId(this.confirmModalActivity);

    if (!activityId) {
      this.toastr.error('Invalid activity id');
      return;
    }

    this.isConfirmLoading = true;
    this.cdr.markForCheck();

    this.adminActivityService.deleteActivity(activityId).subscribe({
      next: () => {
        this.toastr.success('Activity deleted successfully');

        if (this.activities.length === 1 && this.currentPage > 1) {
          this.currentPage--;
        }

        this.isConfirmLoading = false;
        this.closeConfirmModal();
        this.loadActivities();
      },
      error: (error) => {
        console.error('Delete activity error:', error);

        this.toastr.error(
          this.getErrorMessage(error) || 'Failed to delete activity'
        );

        this.isConfirmLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  viewActivity(activity: ActivityListItem): void {
    this.selectedViewActivity = activity;
    this.isViewActivityModalOpen = true;
    this.cdr.markForCheck();
  }

  closeViewActivityModal(): void {
    this.isViewActivityModalOpen = false;
    this.selectedViewActivity = null;
    this.cdr.markForCheck();
  }

  getActivityInitials(activityName: string): string {
    return activityName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  getActivityProvidersCount(activity: ActivityListItem): number {
    return activity.providers?.length ?? 0;
  }

  private buildActivityFormData(): FormData {
    const formValue = this.activityForm.getRawValue();

    const categoryId = this.findCategoryIdByName(formValue.category ?? '');
    const cityId = this.findCityIdByName(formValue.location ?? '');

    const formData = new FormData();

    formData.append('activityName', formValue.name ?? '');
    formData.append('description', formValue.description ?? '');

    formData.append('categoryId', String(categoryId ?? ''));
    formData.append('cityId', String(cityId ?? ''));

    formData.append('price', String(formValue.price ?? 0));
    formData.append('minPrice', String(formValue.price ?? 0));

    formData.append('priceCurrency', 'USD');
    formData.append('priceBasis', 'per person');

    formData.append('duration', String(this.toNumberOrZero(formValue.duration)));

    formData.append(
      'groupSize',
      formValue.maxGroupSize ? `Up to ${formValue.maxGroupSize} people` : ''
    );

    formData.append('cancellation', '');
    formData.append('requiredDocuments', '');

    formData.append('provider', '');
    formData.append('externalId', '');
    formData.append('region', '');

    formData.append('latitude', '');
    formData.append('longitude', '');

    formData.append('rating', String(formValue.rating ?? 0));
    formData.append('reviewCount', '0');

    formData.append('isActive', String(formValue.status === 'Active'));

    if (this.selectedActivityImageFile) {
      formData.append(
        'images',
        this.selectedActivityImageFile,
        this.selectedActivityImageFile.name
      );
    }

    return formData;
  }

  private findCategoryIdByName(categoryName: string): number | null {
    const category = this.filterCategories.find(
      (item) =>
        item.categoryName?.toLowerCase() === categoryName.toLowerCase()
    );

    return category?.categoryID ?? null;
  }

  private findCityIdByName(cityName: string): number | null {
    const city = this.filterCities.find(
      (item) => item.cityName?.toLowerCase() === cityName.toLowerCase()
    );

    return city?.cityID ?? null;
  }

  private getActivityId(activity: any): number {
    return Number(
      activity?.activityID ?? activity?.activityId ?? activity?.id ?? 0
    );
  }

  private toNumberOrZero(value: unknown): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const numericValue = Number(value);

    return Number.isNaN(numericValue) ? 0 : numericValue;
  }

  private revokeSelectedActivityImagePreview(): void {
    if (this.selectedActivityImagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.selectedActivityImagePreview);
    }
  }

  private getErrorMessage(error: any): string {
    const rawError = error?.error;

    if (typeof rawError === 'string') {
      try {
        const parsedError = JSON.parse(rawError);
        return parsedError?.message || parsedError?.Message || rawError;
      } catch {
        return rawError;
      }
    }

    return (
      rawError?.message ||
      rawError?.Message ||
      error?.message ||
      'Something went wrong'
    );
  }
}