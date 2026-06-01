import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

interface IUser {
  id: number;
  name: string;
  email: string;
  role: string;
  joined: string;
  wishlist: number;
  status: 'Active' | 'Inactive';
    image: string;

}

@Component({
  selector: 'app-users',
  imports: [ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent {

  userSearch = '';
  selectedRole = 'all';
  selectedStatus = 'all';

  currentPage = 1;
  itemsPerPage = 3;

  isAddUserModalOpen = false;

  userForm: any;

  constructor(private fb: FormBuilder) {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', Validators.required],
      role: ['User', Validators.required],
      joined: [''],
      wishlist: [0],
      status: ['Active' as 'Active' | 'Inactive'],
      image: [''],
    });
  }

  users: IUser[] = [
    {
      id: 1,
      name: 'Ahmed Mohamed',
      email: 'ahmed@example.com',
      role: 'Admin',
      joined: 'May 15, 2023',
      wishlist: 5,
      status: 'Active',
      image: 'https://i.pravatar.cc/100?img=1',
    },
    {
      id: 2,
      name: 'Sara Hassan',
      email: 'sara@example.com',
      role: 'User',
      joined: 'Aug 22, 2023',
      wishlist: 3,
      status: 'Active',
      image: 'https://i.pravatar.cc/100?img=5',
    },
    {
      id: 3,
      name: 'Omar Ibrahim',
      email: 'omar@example.com',
      role: 'User',
      joined: 'Nov 10, 2023',
      wishlist: 8,
      status: 'Active',
      image: 'https://i.pravatar.cc/100?img=12',
    },
    {
      id: 4,
      name: 'Layla Ahmed',
      email: 'layla@example.com',
      role: 'User',
      joined: 'Jan 5, 2024',
      wishlist: 2,
      status: 'Active',
      image: 'https://i.pravatar.cc/100?img=9',
    },
    {
      id: 5,
      name: 'Youssef Ali',
      email: 'youssef@example.com',
      role: 'User',
      joined: 'Mar 12, 2024',
      wishlist: 6,
      status: 'Active',
      image: 'https://i.pravatar.cc/100?img=15',
    },
    {
      id: 6,
      name: 'Mariam Adel',
      email: 'mariam@example.com',
      role: 'User',
      joined: 'Apr 2, 2024',
      wishlist: 4,
      status: 'Inactive',
      image: 'https://i.pravatar.cc/100?img=20',
    },
    {
      id: 7,
      name: 'Khaled Samy',
      email: 'khaled@example.com',
      role: 'Admin',
      joined: 'Jun 18, 2024',
      wishlist: 7,
      status: 'Active',
      image: 'https://i.pravatar.cc/100?img=18',
    },
    {
      id: 8,
      name: 'Nour Tarek',
      email: 'nour@example.com',
      role: 'User',
      joined: 'Jul 9, 2024',
      wishlist: 1,
      status: 'Inactive',
      image: 'https://i.pravatar.cc/100?img=25',
    },
  ];

  // total pages
  get totalPages(): number {
    return Math.ceil(this.users.length / this.itemsPerPage);
  }

  // Users in the current page
  get paginatedUsers(): IUser[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;

    return this.users.slice(startIndex, endIndex);
  }

  // number of pages
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // change page
  goToPage(page: number): void {
    this.currentPage = page;
  }

  // next page
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // previousPage
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // first user number in the current page
  get startItem(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  // last user number in the current page
  get endItem(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.users.length);
  }

  // open add user modal
  openAddUserModal(): void {
    this.isAddUserModalOpen = true;
  }

  // close add user modal
  closeAddUserModal(): void {
    this.isAddUserModalOpen = false;

    this.userForm.reset({
      name: '',
      email: '',
      role: 'User',
      joined: '',
      wishlist: 0,
      status: 'Active',
      image: '',
    });
  }

  // add new user from form
  addUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formValue = this.userForm.getRawValue();

    const newUser: IUser = {
      id: this.users.length + 1,
      name: formValue.name ?? '',
      email: formValue.email ?? '',
      role: formValue.role ?? 'User',
      joined: formValue.joined ?? '',
      wishlist: formValue.wishlist ?? 0,
      status: formValue.status ?? 'Active',
      image: formValue.image ?? 'https://i.pravatar.cc/100?img=30',
    };

    this.users.unshift(newUser);
    this.currentPage = 1;
    this.closeAddUserModal();
  }

}
