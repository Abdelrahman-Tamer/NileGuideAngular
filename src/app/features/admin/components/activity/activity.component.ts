import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

interface IActivity {
  id: number;
  name: string;
  category: string;
  price: number;
  location: string;
  status: 'Active' | 'Inactive';
}
@Component({
  selector: 'app-activity',
  imports: [ReactiveFormsModule],
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.css',
})
export class ActivityComponent {

  activitySearch = '';
  selectedCategory = 'all';
  selectedStatus = 'all';

  currentPage = 1;
  itemsPerPage = 3;

  isAddActivityModalOpen = false;

  activityForm;

  constructor(private fb: FormBuilder) {
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

  activities: IActivity[] = [
    {
      id: 1,
      name: 'Private Pyramids Tour',
      category: 'Historical',
      price: 80,
      location: 'Giza',
      status: 'Active',
    },
    {
      id: 2,
      name: 'Nile River  Cruise',
      category: 'Cruise',
      price: 450,
      location: 'Luxor-Aswan',
      status: 'Active',
    },
     {
      id: 3,
      name: 'Sunrise Hot Air Balloon',
      category: 'Adventure',
      price: 120,
      location: 'Luxor',
      status: 'Active',
    },
     {
      id: 4,
      name: 'Grand Egyptian Museum ',
      category: 'Museum',
      price: 150,
      location: 'Giza',
      status: 'Active',
    },
     {
      id: 5,
      name: 'Red Sea Diving',
      category: 'Diving',
      price: 110,
      location: 'Sharm El-Sheikh',
      status: 'Active',
    },
     {
      id: 6,
      name: 'Karnak Temple Tour',
      category: 'Historical',
      price: 60,
      location: 'Luxor',
      status: 'Active',
    },
     {
      id: 7,
      name: 'Khan El-Khalili Bazaar',
      category: 'Cultural',
      price: 30,
      location: 'Cairo',
      status: 'Inactive',
    },
     {
      id: 8,
      name: 'Abu Simbel Day Trip',
      category: 'Historical',
      price: 95,
      location: 'Aswan',
      status: 'Active',
    }
  ];

  // total pages
  get totalPages(): number {
    return Math.ceil(this.activities.length / this.itemsPerPage);
  }

  // Activities in the current page
  get paginatedActivities(): IActivity[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;

    return this.activities.slice(startIndex, endIndex);
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

  // first activity number in the current page
  get startItem(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  // last activity number in the current page
  get endItem(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.activities.length);
  }

  // open add activity modal
  openAddActivityModal(): void {
    this.isAddActivityModalOpen = true;
  }

  // close add activity modal
  closeAddActivityModal(): void {
    this.isAddActivityModalOpen = false;

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
  }

  // add new activity from form
  addActivity(): void {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }

    const formValue = this.activityForm.getRawValue();

    const newActivity: IActivity = {
      id: this.activities.length + 1,
      name: formValue.name ?? '',
      category: formValue.category ?? '',
      price: formValue.price ?? 0,
      location: formValue.location ?? '',
      status: formValue.status ?? 'Active',
    };

    this.activities.unshift(newActivity);
    this.currentPage = 1;
    this.closeAddActivityModal();
  }

}