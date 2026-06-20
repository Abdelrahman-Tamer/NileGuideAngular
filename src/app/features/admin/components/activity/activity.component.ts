import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { ActivityService as AdminActivityService } from './activity.service';
import {
  AdminActivityCategory,
  AdminActivityCity,
  AdminActivityHour,
  AdminActivityImage,
  AdminActivityItem,
  AdminBookingLink,
} from './activity';

type ActivityStatusFilter = 'all' | 'active' | 'inactive';
type ActivityFormMode = 'add' | 'edit';

type AdminActivityViewItem = AdminActivityItem & {
  activityID?: number;
  categoryID?: number;
  cityID?: number;
  imageUrl?: string | null;
  reviewsCount?: number;
  providers?: AdminBookingLink[];
};

@Component({
  selector: 'app-activity',
  imports: [CommonModule, ReactiveFormsModule],
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

  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly pageGroupSize = 3;
  readonly maxActivityImageSize = 5 * 1024 * 1024;

  isLoading = false;
  errorMessage = '';

  isAddActivityModalOpen = false;
  isSavingActivity = false;
  activityFormMode: ActivityFormMode = 'add';

  selectedActivity: AdminActivityViewItem | null = null;
  selectedActivityId: number | null = null;

  selectedActivityImageFile: File | null = null;
  selectedActivityImageFiles: File[] = [];
  selectedActivityImagePreview: string | null = null;
  selectedActivityImagePreviews: string[] = [];
  existingActivityImages: AdminActivityImage[] = [];

  isViewActivityModalOpen = false;
  selectedViewActivity: AdminActivityViewItem | null = null;

  isConfirmModalOpen = false;
  isConfirmLoading = false;
  confirmModalActivity: AdminActivityViewItem | null = null;
  confirmModalTitle = '';
  confirmModalMessage = '';
  confirmModalButtonText = '';

  activities: AdminActivityViewItem[] = [];
  filterCategories: AdminActivityCategory[] = [];
  filterCities: AdminActivityCity[] = [];

  searchTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;

  activityForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private adminActivityService: AdminActivityService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {
    this.activityForm = this.fb.group({
      activityName: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(255)],
      ],
      name: [''],

      description: ['', [Validators.required, Validators.minLength(10)]],

      categoryId: [null as number | null, Validators.required],
      category: [''],

      cityId: [null as number | null, Validators.required],
      location: [''],

      price: [null as number | null, [Validators.required, Validators.min(0.01)]],
      minPrice: [null as number | null],

      priceCurrency: [
        'USD',
        [Validators.required, Validators.minLength(3), Validators.maxLength(10)],
      ],
      priceBasis: ['per person'],

      duration: [null as number | null, [Validators.required, Validators.min(1)]],

      groupSize: ['', Validators.required],
      maxGroupSize: [null as number | null],

      cancellation: [''],
      requiredDocuments: [''],

      provider: [''],
      externalId: [''],
      region: [''],

      latitude: [null as number | null],
      longitude: [null as number | null],

      rating: [0, [Validators.min(0), Validators.max(5)]],

      isActive: [true],
      status: ['Active' as 'Active' | 'Inactive'],

      imageUrl: [''],

      bookingLinks: this.fb.array([]),
      activityHours: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.loadAdminActivities();
    this.loadCategories();
    this.loadCities();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.revokeSelectedActivityImagePreview();
  }

  get bookingLinksArray(): FormArray {
    return this.activityForm.get('bookingLinks') as FormArray;
  }

  get activityHoursArray(): FormArray {
    return this.activityForm.get('activityHours') as FormArray;
  }

  loadFilters(): void {
    if (!this.isBrowser) {
      return;
    }

    this.loadCategories();
    this.loadCities();
  }

  loadCategories(): void {
    if (!this.isBrowser) {
      return;
    }

    this.adminActivityService.getCategories().subscribe({
      next: (categories) => {
        this.filterCategories = categories ?? [];
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load categories', error);
      },
    });
  }

  loadCities(): void {
    if (!this.isBrowser) {
      return;
    }

    this.adminActivityService.getCities().subscribe({
      next: (cities) => {
        this.filterCities = cities ?? [];
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load cities', error);
      },
    });
  }

  loadActivities(): void {
    this.loadAdminActivities();
  }

  loadAdminActivities(): void {
    if (!this.isBrowser) {
      return;
    }

    const currentRequestId = ++this.requestId;

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.adminActivityService
      .getAdminActivities({
        search: this.activitySearch?.trim() ?? '',
        categoryIds:
          this.selectedCategory === 'all'
            ? []
            : [Number(this.selectedCategory)],
        cityIds:
          this.selectedCity === 'all' ? [] : [Number(this.selectedCity)],
        page: this.currentPage,
        pageSize: this.itemsPerPage,
      })
      .subscribe({
        next: (response) => {
          if (currentRequestId !== this.requestId) {
            return;
          }

          this.activities = (response.items ?? []).map((activity) =>
            this.toViewActivity(activity)
          );

          this.totalCount = response.totalCount ?? 0;
          this.currentPage = response.page ?? this.currentPage;
          this.itemsPerPage = response.pageSize ?? this.itemsPerPage;

          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (currentRequestId !== this.requestId) {
            return;
          }

          console.error('Failed to load admin activities', error);

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

  get paginatedActivities(): AdminActivityViewItem[] {
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
    if (!this.isBrowser) {
      return;
    }

    if (!this.canGoPreviousPageGroup) {
      return;
    }

    this.currentPage = this.pageGroupStart - 1;
    this.loadAdminActivities();
  }

  nextPageGroup(): void {
    if (!this.isBrowser) {
      return;
    }

    if (!this.canGoNextPageGroup) {
      return;
    }

    this.currentPage = this.pageGroupEnd + 1;
    this.loadAdminActivities();
  }

  onSearchChange(value: string): void {
    if (!this.isBrowser) {
      return;
    }

    this.activitySearch = value;

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadAdminActivities();
    }, 300);
  }

  onCategoryChange(value: string): void {
    if (!this.isBrowser) {
      return;
    }

    this.selectedCategory = value;
    this.currentPage = 1;
    this.loadAdminActivities();
  }

  onCityChange(value: string): void {
    if (!this.isBrowser) {
      return;
    }

    this.selectedCity = value;
    this.currentPage = 1;
    this.loadAdminActivities();
  }

  onStatusChange(value: string): void {
    this.selectedStatus = value as ActivityStatusFilter;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  goToPage(page: number): void {
    if (!this.isBrowser) {
      return;
    }

    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.loadAdminActivities();
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
    this.existingActivityImages = [];

    this.resetActivityForm();

    this.isAddActivityModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditActivityModal(activity: AdminActivityViewItem): void {
    const activityId = this.getActivityId(activity);

    if (!activityId) {
      this.toastr.error('Invalid activity id');
      return;
    }

    this.activityFormMode = 'edit';
    this.selectedActivity = activity;
    this.selectedActivityId = activityId;
    this.existingActivityImages = activity.images ?? [];

    this.clearSelectedActivityImages();

    const primaryImage = this.getPrimaryImageUrl(activity);

    this.selectedActivityImagePreview = primaryImage;
    this.selectedActivityImagePreviews = primaryImage ? [primaryImage] : [];

    this.activityForm.patchValue({
      activityName: activity.activityName ?? '',
      name: activity.activityName ?? '',

      description: activity.description ?? '',

      categoryId: activity.categoryId ?? activity.categoryID ?? null,
      category: activity.categoryName ?? '',

      cityId: activity.cityId ?? activity.cityID ?? null,
      location: activity.cityName ?? '',

      price: activity.price ?? null,
      minPrice: activity.minPrice ?? null,

      priceCurrency: activity.priceCurrency ?? 'USD',
      priceBasis: activity.priceBasis ?? '',

      duration: activity.duration ?? null,

      groupSize: activity.groupSize ?? '',
      maxGroupSize: this.extractGroupSizeNumber(activity.groupSize),

      cancellation: activity.cancellation ?? '',
      requiredDocuments: activity.requiredDocuments ?? '',

      provider: activity.provider ?? '',
      externalId: activity.externalId ?? '',
      region: activity.region ?? '',

      latitude: activity.latitude ?? null,
      longitude: activity.longitude ?? null,

      rating: activity.rating ?? 0,

      isActive: !!activity.isActive,
      status: activity.isActive ? 'Active' : 'Inactive',

      imageUrl: primaryImage ?? '',
    });

    this.setBookingLinks(activity.bookingLinks ?? []);
    this.setActivityHours(activity.activityHours ?? []);

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
    this.existingActivityImages = [];

    this.resetActivityForm();
    this.cdr.markForCheck();
  }

  resetActivityForm(): void {
    this.activityForm.reset({
      activityName: '',
      name: '',
      description: '',

      categoryId: null,
      category: '',

      cityId: null,
      location: '',

      price: null,
      minPrice: null,

      priceCurrency: 'USD',
      priceBasis: 'per person',

      duration: null,

      groupSize: '',
      maxGroupSize: null,

      cancellation: '',
      requiredDocuments: '',

      provider: '',
      externalId: '',
      region: '',

      latitude: null,
      longitude: null,

      rating: 0,

      isActive: true,
      status: 'Active',

      imageUrl: '',
    });

    this.clearFormArray(this.bookingLinksArray);
    this.clearFormArray(this.activityHoursArray);

    this.clearSelectedActivityImages();
  }

  onActivityImageSelected(event: Event): void {
    if (!this.isBrowser) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (!files.length) {
      return;
    }

    const invalidFile = files.find((file) => !file.type.startsWith('image/'));

    if (invalidFile) {
      this.toastr.error('Please select valid image files only');
      input.value = '';
      return;
    }

    const largeFile = files.find((file) => file.size > this.maxActivityImageSize);

    if (largeFile) {
      this.toastr.error('Each image size must be less than 5MB');
      input.value = '';
      return;
    }

    this.revokeSelectedActivityImagePreview();

    this.selectedActivityImageFiles = files;
    this.selectedActivityImageFile = files[0] ?? null;

    this.selectedActivityImagePreviews = files.map((file) =>
      URL.createObjectURL(file)
    );

    this.selectedActivityImagePreview =
      this.selectedActivityImagePreviews[0] ?? null;

    this.activityForm.patchValue({
      imageUrl: this.selectedActivityImagePreview ?? '',
    });

    this.cdr.markForCheck();
  }

  removeSelectedActivityImage(input: HTMLInputElement): void {
    input.value = '';

    this.clearSelectedActivityImages();

    const oldImage =
      this.activityFormMode === 'edit' && this.selectedActivity
        ? this.getPrimaryImageUrl(this.selectedActivity)
        : null;

    if (oldImage) {
      this.selectedActivityImagePreview = oldImage;
      this.selectedActivityImagePreviews = [oldImage];

      this.activityForm.patchValue({
        imageUrl: oldImage,
      });
    } else {
      this.activityForm.patchValue({
        imageUrl: '',
      });
    }

    this.cdr.markForCheck();
  }

  addBookingLink(link?: Partial<AdminBookingLink>): void {
    this.bookingLinksArray.push(
      this.fb.group({
        provider: [link?.provider ?? '', Validators.maxLength(50)],
        url: [link?.url ?? ''],
      })
    );

    this.cdr.markForCheck();
  }

  removeBookingLink(index: number): void {
    this.bookingLinksArray.removeAt(index);
    this.cdr.markForCheck();
  }

  addActivityHour(hour?: Partial<AdminActivityHour>): void {
    this.activityHoursArray.push(
      this.fb.group({
        openHour: [
          hour?.openHour ?? null,
          [Validators.min(1), Validators.max(12)],
        ],
        openAmPm: [hour?.openAmPm ?? 'AM'],
        closeHour: [
          hour?.closeHour ?? null,
          [Validators.min(1), Validators.max(12)],
        ],
        closeAmPm: [hour?.closeAmPm ?? 'PM'],
      })
    );

    this.cdr.markForCheck();
  }

  removeActivityHour(index: number): void {
    this.activityHoursArray.removeAt(index);
    this.cdr.markForCheck();
  }

  addActivity(): void {
    this.saveActivity();
  }

  saveActivity(): void {
    this.syncAliasControlsBeforeSave();

    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      this.toastr.warning('Please fill all required fields correctly');
      return;
    }

    if (this.activityFormMode === 'add' && !this.selectedActivityImageFiles.length) {
      this.toastr.warning('Please upload at least one activity image');
      return;
    }

    if (this.activityFormMode === 'edit') {
      this.updateActivity();
      return;
    }

    this.createActivity();
  }

  private createActivity(): void {
    if (!this.isBrowser) {
      return;
    }

    const formData = this.buildActivityFormData();

    this.isSavingActivity = true;
    this.cdr.markForCheck();

    this.adminActivityService.createActivity(formData).subscribe({
      next: () => {
        this.toastr.success('Activity created successfully');

        this.isSavingActivity = false;
        this.closeAddActivityModal();

        this.currentPage = 1;
        this.loadAdminActivities();
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
    if (!this.isBrowser) {
      return;
    }

    if (!this.selectedActivityId) {
      this.toastr.error('Invalid activity id');
      return;
    }

    const formData = this.buildActivityFormData();

    this.isSavingActivity = true;
    this.cdr.markForCheck();

    this.adminActivityService
      .updateActivity(this.selectedActivityId, formData)
      .subscribe({
        next: () => {
          this.toastr.success('Activity updated successfully');

          this.isSavingActivity = false;
          this.closeAddActivityModal();

          this.loadAdminActivities();
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

  deleteActivity(activity: AdminActivityViewItem): void {
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
    if (!this.isBrowser) {
      return;
    }

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
        this.loadAdminActivities();
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

  viewActivity(activity: AdminActivityViewItem): void {
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

  getActivityProvidersCount(activity: AdminActivityViewItem): number {
    return activity.bookingLinks?.length ?? activity.providers?.length ?? 0;
  }

  getPrimaryImageUrl(
    activity: AdminActivityItem | AdminActivityViewItem | null | undefined
  ): string | null {
    if (!activity?.images?.length) {
      return null;
    }

    const primaryImage =
      activity.images.find((image) => image.isPrimary) ??
      [...activity.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];

    return primaryImage?.url ?? null;
  }

  getCategoryId(category: AdminActivityCategory): number {
    return Number((category as any).categoryID ?? (category as any).categoryId);
  }

  getCategoryName(category: AdminActivityCategory): string {
    return String((category as any).categoryName ?? '');
  }

  getCityId(city: AdminActivityCity): number {
    return Number((city as any).cityID ?? (city as any).cityId);
  }

  getCityName(city: AdminActivityCity): string {
    return String((city as any).cityName ?? '');
  }

  private buildActivityFormData(): FormData {
    this.syncAliasControlsBeforeSave();

    const formValue = this.activityForm.getRawValue() as any;

    const formData = new FormData();

    formData.append('ActivityName', this.toText(formValue.activityName));
    formData.append('Description', this.toText(formValue.description));
    formData.append('CategoryId', String(formValue.categoryId ?? ''));
    formData.append('CityId', String(formValue.cityId ?? ''));
    formData.append('Price', String(formValue.price ?? ''));
    formData.append('PriceCurrency', this.toText(formValue.priceCurrency));
    formData.append('Duration', String(formValue.duration ?? ''));
    formData.append('GroupSize', this.toText(formValue.groupSize));
    formData.append('Rating', String(formValue.rating ?? 0));
    formData.append('IsActive', String(!!formValue.isActive));

    if (
      formValue.minPrice !== null &&
      formValue.minPrice !== undefined &&
      formValue.minPrice !== ''
    ) {
      formData.append('MinPrice', String(formValue.minPrice));
    }

    formData.append('PriceBasis', this.toText(formValue.priceBasis));
    formData.append('Cancellation', this.toText(formValue.cancellation));
    formData.append(
      'RequiredDocuments',
      this.toText(formValue.requiredDocuments)
    );
    formData.append('Provider', this.toText(formValue.provider));
    formData.append('ExternalId', this.toText(formValue.externalId));
    formData.append('Region', this.toText(formValue.region));

    if (
      formValue.latitude !== null &&
      formValue.latitude !== undefined &&
      formValue.latitude !== ''
    ) {
      formData.append('Latitude', String(formValue.latitude));
    }

    if (
      formValue.longitude !== null &&
      formValue.longitude !== undefined &&
      formValue.longitude !== ''
    ) {
      formData.append('Longitude', String(formValue.longitude));
    }

    if (this.activityFormMode === 'edit') {
      const hasNewImages = this.selectedActivityImageFiles.length > 0;

      formData.append('ReplaceImages', String(hasNewImages));

      if (hasNewImages) {
        this.selectedActivityImageFiles.forEach((file) => {
          formData.append('Images', file, file.name);
        });
      }
    } else {
      this.selectedActivityImageFiles.forEach((file) => {
        formData.append('Images', file, file.name);
      });
    }

    this.appendBookingLinks(formData, formValue.bookingLinks ?? []);
    this.appendActivityHours(formData, formValue.activityHours ?? []);

    return formData;
  }

  private appendBookingLinks(formData: FormData, links: any[]): void {
    const validLinks = links.filter(
      (link) => this.toText(link.provider) || this.toText(link.url)
    );

    validLinks.forEach((link, index) => {
      formData.append(
        `BookingLinks[${index}].Provider`,
        this.toText(link.provider)
      );
      formData.append(`BookingLinks[${index}].Url`, this.toText(link.url));
    });
  }

  private appendActivityHours(formData: FormData, hours: any[]): void {
    const validHours = hours.filter(
      (hour) => hour.openHour || hour.openAmPm || hour.closeHour || hour.closeAmPm
    );

    validHours.forEach((hour, index) => {
      formData.append(
        `ActivityHours[${index}].OpenHour`,
        String(hour.openHour ?? '')
      );
      formData.append(
        `ActivityHours[${index}].OpenAmPm`,
        this.toText(hour.openAmPm)
      );
      formData.append(
        `ActivityHours[${index}].CloseHour`,
        String(hour.closeHour ?? '')
      );
      formData.append(
        `ActivityHours[${index}].CloseAmPm`,
        this.toText(hour.closeAmPm)
      );
    });
  }

  private syncAliasControlsBeforeSave(): void {
    const value = this.activityForm.getRawValue() as any;

    const patch: any = {};

    if (!value.activityName && value.name) {
      patch.activityName = value.name;
    }

    if (!value.name && value.activityName) {
      patch.name = value.activityName;
    }

    if (!value.categoryId && value.category) {
      patch.categoryId = this.findCategoryIdByName(value.category);
    }

    if (!value.cityId && value.location) {
      patch.cityId = this.findCityIdByName(value.location);
    }

    if (!value.groupSize && value.maxGroupSize) {
      patch.groupSize = `Up to ${value.maxGroupSize} people`;
    }

    if (!value.maxGroupSize && value.groupSize) {
      patch.maxGroupSize = this.extractGroupSizeNumber(value.groupSize);
    }

    if (value.status) {
      patch.isActive = value.status === 'Active';
    }

    this.activityForm.patchValue(patch, { emitEvent: false });
  }

  private toViewActivity(activity: AdminActivityItem): AdminActivityViewItem {
    const imageUrl = this.getPrimaryImageUrl(activity);

    return {
      ...activity,

      activityID: activity.activityId,
      categoryID: activity.categoryId,
      cityID: activity.cityId,
      imageUrl,
      reviewsCount: activity.reviewCount,
      providers: activity.bookingLinks,
    };
  }

  private setBookingLinks(links: AdminBookingLink[]): void {
    this.clearFormArray(this.bookingLinksArray);

    links.forEach((link) => {
      this.addBookingLink(link);
    });
  }

  private setActivityHours(hours: AdminActivityHour[]): void {
    this.clearFormArray(this.activityHoursArray);

    hours.forEach((hour) => {
      this.addActivityHour(hour);
    });
  }

  private clearFormArray(formArray: FormArray): void {
    while (formArray.length) {
      formArray.removeAt(0);
    }
  }

  private findCategoryIdByName(categoryName: string): number | null {
    const category = this.filterCategories.find(
      (item) =>
        this.getCategoryName(item).toLowerCase() === categoryName.toLowerCase()
    );

    return category ? this.getCategoryId(category) : null;
  }

  private findCityIdByName(cityName: string): number | null {
    const city = this.filterCities.find(
      (item) => this.getCityName(item).toLowerCase() === cityName.toLowerCase()
    );

    return city ? this.getCityId(city) : null;
  }

  private getActivityId(activity: any): number {
    return Number(activity?.activityId ?? activity?.activityID ?? activity?.id ?? 0);
  }

  private extractGroupSizeNumber(groupSize: string | null | undefined): number | null {
    if (!groupSize) {
      return null;
    }

    const numbers = groupSize.match(/\d+/g);

    if (!numbers?.length) {
      return null;
    }

    return Number(numbers[numbers.length - 1]);
  }

  private clearSelectedActivityImages(): void {
    this.revokeSelectedActivityImagePreview();

    this.selectedActivityImageFile = null;
    this.selectedActivityImageFiles = [];
    this.selectedActivityImagePreview = null;
    this.selectedActivityImagePreviews = [];
  }

  private revokeSelectedActivityImagePreview(): void {
    if (!this.isBrowser) {
      return;
    }

    this.selectedActivityImagePreviews.forEach((preview) => {
      if (preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });

    if (this.selectedActivityImagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.selectedActivityImagePreview);
    }
  }

  private toText(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value).trim();
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