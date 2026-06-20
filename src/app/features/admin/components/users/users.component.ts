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
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { UsersService } from './users.service';
import { CreateUserRole, UserItem } from './users';

type UserListRole = UserItem['role'];
type UserStatusFilter = 'all' | 'active' | 'inactive';
type UserRoleFilter = 'all' | CreateUserRole;

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  userSearch = '';

  selectedRole: UserRoleFilter = 'all';
  selectedStatus: UserStatusFilter = 'all';

  currentPage = 1;
  itemsPerPage = 10;
  totalCount = 0;

  readonly pageGroupSize = 3;
  readonly maxProfileImageSize = 2 * 1024 * 1024;

  isLoading = false;
  errorMessage = '';

  isAddUserModalOpen = false;
  isViewUserModalOpen = false;
  isRoleModalOpen = false;

  selectedUser: UserItem | null = null;
  roleModalUser: UserItem | null = null;
  selectedRoleForModal: CreateUserRole = 'User';

  selectedProfileImageFile: File | null = null;
  selectedProfileImagePreview: string | null = null;

  isConfirmModalOpen = false;
  isConfirmLoading = false;

  confirmModalType: 'delete' | 'status' | null = null;
  confirmModalUser: UserItem | null = null;
  confirmNextIsActive: boolean | null = null;

  confirmModalTitle = '';
  confirmModalMessage = '';
  confirmModalButtonText = '';

  users: UserItem[] = [];

  searchTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;

  userForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      nationality: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      role: ['User' as CreateUserRole, Validators.required],
      status: ['Active' as 'Active' | 'Inactive'],
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadUsers();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  loadUsers(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const currentRequestId = ++this.requestId;

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.usersService
      .getUsers({
        search: this.userSearch.trim() || undefined,
        role: this.getApiRole(),
        isActive: this.getApiStatus(),
        page: this.currentPage,
        pageSize: this.itemsPerPage,
      })
      .subscribe({
        next: (response) => {
          if (currentRequestId !== this.requestId) return;

          this.users = response.items ?? [];
          this.totalCount = response.totalCount ?? 0;
          this.currentPage = response.page ?? this.currentPage;
          this.itemsPerPage = response.pageSize ?? this.itemsPerPage;

          this.isLoading = false;
          this.errorMessage = '';

          this.cdr.markForCheck();
        },
        error: (error) => {
          if (currentRequestId !== this.requestId) return;

          console.error('Error loading users:', error);

          this.users = [];
          this.totalCount = 0;
          this.errorMessage = 'Failed to load users';
          this.isLoading = false;

          this.cdr.markForCheck();
        },
      });
  }

  private getApiRole(): string | undefined {
    if (this.selectedRole === 'all') return undefined;
    return this.selectedRole;
  }

  private getApiStatus(): boolean | undefined {
    if (this.selectedStatus === 'all') return undefined;
    return this.selectedStatus === 'active';
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.itemsPerPage);
  }

  get paginatedUsers(): UserItem[] {
    return this.users;
  }

  get startItem(): number {
    if (this.totalCount === 0) return 0;
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalCount);
  }

  get pageGroupStart(): number {
    if (this.totalPages <= this.pageGroupSize) {
      return 1;
    }

    const normalGroupStart =
      Math.floor((this.currentPage - 1) / this.pageGroupSize) *
        this.pageGroupSize +
      1;

    const lastPossibleGroupStart = Math.max(
      1,
      this.totalPages - this.pageGroupSize + 1
    );

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
    if (!this.canGoPreviousPageGroup) return;

    this.currentPage = this.pageGroupStart - 1;
    this.loadUsers();
  }

  nextPageGroup(): void {
    if (!this.canGoNextPageGroup) return;

    this.currentPage = this.pageGroupEnd + 1;
    this.loadUsers();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;
    this.loadUsers();
  }

  onSearchChange(value: string): void {
    this.userSearch = value;

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadUsers();
    }, 300);
  }

  onRoleChange(value: string): void {
    this.selectedRole = value as UserRoleFilter;
    this.currentPage = 1;
    this.loadUsers();
  }

  onStatusChange(value: string): void {
    this.selectedStatus = value as UserStatusFilter;
    this.currentPage = 1;
    this.loadUsers();
  }

  formatDate(date?: string): string {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private formatDateForApi(dateValue: string): string {
    if (!dateValue) return '';

    const value = String(dateValue).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const usDateMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (usDateMatch) {
      const month = usDateMatch[1].padStart(2, '0');
      const day = usDateMatch[2].padStart(2, '0');
      const year = usDateMatch[3];

      return `${year}-${month}-${day}`;
    }

    const parsedDate = new Date(value);

    if (isNaN(parsedDate.getTime())) {
      return value;
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getErrorMessage(error: any): string {
    const rawError = error?.error;

    if (typeof rawError === 'string') {
      try {
        const parsed = JSON.parse(rawError);
        return parsed?.message || parsed?.Message || rawError;
      } catch {
        return rawError || 'Something went wrong';
      }
    }

    return (
      rawError?.message ||
      rawError?.Message ||
      error?.message ||
      'Something went wrong'
    );
  }

  onProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastr.error('Please select a valid image file');
      input.value = '';
      return;
    }

    if (file.size > this.maxProfileImageSize) {
      this.toastr.error('Image size must be less than 2MB');
      input.value = '';
      return;
    }

    this.selectedProfileImageFile = file;

    const reader = new FileReader();

    reader.onload = () => {
      this.selectedProfileImagePreview = reader.result as string;
      this.cdr.markForCheck();
    };

    reader.readAsDataURL(file);
  }

  removeSelectedProfileImage(input?: HTMLInputElement): void {
    this.selectedProfileImageFile = null;
    this.selectedProfileImagePreview = null;

    if (input) {
      input.value = '';
    }

    this.cdr.markForCheck();
  }

  getUserInitials(fullName: string): string {
    if (!fullName || !fullName.trim()) {
      return '?';
    }

    const nameParts = fullName.trim().split(/\s+/);

    if (nameParts.length >= 2) {
      const firstInitial = nameParts[0].charAt(0);
      const lastInitial = nameParts[nameParts.length - 1].charAt(0);

      return (firstInitial + lastInitial).toUpperCase();
    }

    const singleName = nameParts[0];

    if (singleName.length === 1) {
      return singleName.charAt(0).toUpperCase();
    }

    const firstChar = singleName.charAt(0);
    const lastChar = singleName.charAt(singleName.length - 1);

    return (firstChar + lastChar).toUpperCase();
  }

  getWishlistCount(user: UserItem): number {
    return user.wishlistItems ?? 0;
  }

  getRoleLabel(role: UserListRole): string {
    if (role === 'Tourist') return 'User';
    return role;
  }

  openAddUserModal(): void {
    this.isAddUserModalOpen = true;
  }

  closeAddUserModal(): void {
    this.isAddUserModalOpen = false;
    this.resetUserForm();
  }

  resetUserForm(): void {
    this.userForm.reset({
      name: '',
      email: '',
      password: '',
      nationality: '',
      dateOfBirth: '',
      role: 'User',
      status: 'Active',
    });

    this.selectedProfileImageFile = null;
    this.selectedProfileImagePreview = null;
  }

  createUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.toastr.warning('Please fill all required fields');
      return;
    }

    const formValue = this.userForm.getRawValue();

    const formData = new FormData();

    formData.append('fullName', formValue.name?.trim() ?? '');
    formData.append('email', formValue.email?.trim() ?? '');
    formData.append('password', formValue.password ?? '');
    formData.append('nationality', formValue.nationality?.trim() ?? '');
    formData.append('dateOfBirth', this.formatDateForApi(formValue.dateOfBirth));
    formData.append('role', formValue.role ?? 'User');
    formData.append('isActive', String(formValue.status === 'Active'));

    if (this.selectedProfileImageFile) {
      formData.append(
        'file',
        this.selectedProfileImageFile,
        this.selectedProfileImageFile.name
      );
    }

    this.usersService.createUser(formData).subscribe({
      next: () => {
        this.toastr.success('User created successfully');
        this.closeAddUserModal();
        this.currentPage = 1;
        this.loadUsers();
      },
      error: (error) => {
        console.error('Create user error:', error);

        const message = this.getErrorMessage(error);

        if (error?.status === 409) {
          this.userForm.get('email')?.setErrors({ emailExists: true });
          this.toastr.error(message || 'Email already exists');
          return;
        }

        this.toastr.error(message || 'Failed to create user');
      },
    });
  }

  addUser(): void {
    this.createUser();
  }

  viewUser(userId: number): void {
    this.usersService.getUserById(userId).subscribe({
      next: (user) => {
        this.selectedUser = user;
        this.isViewUserModalOpen = true;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('View user error:', error);
        this.toastr.error('Failed to load user details');
      },
    });
  }

  closeViewUserModal(): void {
    this.isViewUserModalOpen = false;
    this.selectedUser = null;
  }

  openRoleModal(user: UserItem): void {
    this.roleModalUser = user;
    this.selectedRoleForModal = user.role === 'Admin' ? 'Admin' : 'User';
    this.isRoleModalOpen = true;
  }

  closeRoleModal(): void {
    this.roleModalUser = null;
    this.isRoleModalOpen = false;
  }

  saveRole(): void {
    if (!this.roleModalUser) return;

    this.usersService
      .updateUserRole(this.roleModalUser.id, this.selectedRoleForModal)
      .subscribe({
        next: () => {
          this.toastr.success('User role updated successfully');
          this.closeRoleModal();
          this.loadUsers();
        },
        error: (error) => {
          console.error('Update role error:', error);
          this.toastr.error('Failed to update user role');
        },
      });
  }

  toggleUserStatus(user: UserItem): void {
    const nextIsActive = !user.isActive;

    this.confirmModalType = 'status';
    this.confirmModalUser = user;
    this.confirmNextIsActive = nextIsActive;

    this.confirmModalTitle = nextIsActive ? 'Activate User' : 'Block User';

    this.confirmModalMessage = nextIsActive
      ? `Are you sure you want to activate ${user.fullName}?`
      : `Are you sure you want to block ${user.fullName}?`;

    this.confirmModalButtonText = nextIsActive ? 'Yes, Activate' : 'Yes, Block';

    this.isConfirmModalOpen = true;
    this.cdr.markForCheck();
  }

  deleteUser(user: UserItem): void {
    this.confirmModalType = 'delete';
    this.confirmModalUser = user;
    this.confirmNextIsActive = null;

    this.confirmModalTitle = 'Delete User';
    this.confirmModalMessage = `Are you sure you want to delete ${user.fullName}?`;
    this.confirmModalButtonText = 'Yes, Delete';

    this.isConfirmModalOpen = true;
    this.cdr.markForCheck();
  }

  closeConfirmModal(): void {
    if (this.isConfirmLoading) return;

    this.isConfirmModalOpen = false;
    this.confirmModalType = null;
    this.confirmModalUser = null;
    this.confirmNextIsActive = null;

    this.confirmModalTitle = '';
    this.confirmModalMessage = '';
    this.confirmModalButtonText = '';

    this.cdr.markForCheck();
  }

  confirmAction(): void {
    if (!this.confirmModalUser || !this.confirmModalType) return;

    if (this.confirmModalType === 'delete') {
      this.confirmDeleteUser();
      return;
    }

    if (this.confirmModalType === 'status') {
      this.confirmUpdateUserStatus();
    }
  }

  private confirmDeleteUser(): void {
    if (!this.confirmModalUser) return;

    const user = this.confirmModalUser;
    this.isConfirmLoading = true;
    this.cdr.markForCheck();

    this.usersService.deleteUser(user.id).subscribe({
      next: () => {
        this.toastr.success('User deleted successfully');

        if (this.users.length === 1 && this.currentPage > 1) {
          this.currentPage--;
        }

        this.isConfirmLoading = false;
        this.closeConfirmModal();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Delete user error:', error);
        this.toastr.error('Failed to delete user');

        this.isConfirmLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private confirmUpdateUserStatus(): void {
    if (!this.confirmModalUser || this.confirmNextIsActive === null) return;

    const user = this.confirmModalUser;
    const nextIsActive = this.confirmNextIsActive;

    this.isConfirmLoading = true;
    this.cdr.markForCheck();

    this.usersService.updateUserActiveStatus(user.id, nextIsActive).subscribe({
      next: () => {
        this.toastr.success(
          nextIsActive
            ? 'User activated successfully'
            : 'User blocked successfully'
        );

        this.isConfirmLoading = false;
        this.closeConfirmModal();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Update status error:', error);
        this.toastr.error('Failed to update user status');

        this.isConfirmLoading = false;
        this.cdr.markForCheck();
      },
    });
  }
}