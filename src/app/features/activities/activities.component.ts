import { Component, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

interface ActivityCardData {
  id: number;
  title: string;
  category: string;
  rating: number;
  ratingCount: number;
  description: string;
  noIdNeeded: boolean;
  startingFrom: string;
  image: string;
  imageAlt: string;
}

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './activities.component.html',
  styleUrl: './activities.component.css',
})
export class ActivitiesComponent {
  readonly isFilterOpen = signal(false);

  readonly categories = [
    'History & Culture',
    'Pyramids',
    'Local Food',
    'Nile Cruise',
    'Red Sea Diving',
    'Luxury & Relaxation',
    'Museums',
    'Adventure',
  ];

  readonly cities = [
    'Cairo',
    'Luxor',
    'Aswan',
    'Giza',
    'Alexandria',
    'Dahab',
    'Hurghada',
    'Sharm El Sheikh',
  ];

  readonly activities: ActivityCardData[] = [
    {
      id: 1,
      title: 'Grand Egyptian Museum VIP',
      category: 'Museum',
      rating: 5.0,
      ratingCount: 89,
      description:
        'Early access to Egypt’s iconic museum with a curated VIP cultural experience.',
      noIdNeeded: true,
      startingFrom: '$150',
      image: '/Photo/Alexandria.png',
      imageAlt: 'Grand Egyptian Museum VIP',
    },
    {
      id: 2,
      title: 'Cairo Old Town Walk',
      category: 'Culture',
      rating: 4.8,
      ratingCount: 64,
      description:
        'Walk through Islamic Cairo with a local historian and taste authentic street food.',
      noIdNeeded: true,
      startingFrom: '$45',
      image: '/Photo/Cairo.png',
      imageAlt: 'Cairo Old Town Walk',
    },
    {
      id: 3,
      title: 'Alexandria Coastal Day Trip',
      category: 'Adventure',
      rating: 4.7,
      ratingCount: 122,
      description:
        'A relaxed day along the Mediterranean with citadel views and seaside lunch.',
      noIdNeeded: true,
      startingFrom: '$95',
      image: '/Photo/Alexandria.png',
      imageAlt: 'Alexandria Coastal Day Trip',
    },
    {
      id: 4,
      title: 'Aswan Sunset Cruise',
      category: 'Nile Cruise',
      rating: 4.9,
      ratingCount: 210,
      description:
        'Sail the Nile at golden hour aboard a traditional felucca with light refreshments.',
      noIdNeeded: true,
      startingFrom: '$60',
      image: '/Photo/Aswan.png',
      imageAlt: 'Aswan Sunset Cruise',
    },
    {
      id: 5,
      title: 'Pyramids Half-Day Adventure',
      category: 'Pyramids',
      rating: 5.0,
      ratingCount: 308,
      description:
        'Stand at the foot of the Great Pyramid with a private guide and skip-the-line entry.',
      noIdNeeded: true,
      startingFrom: '$120',
      image: '/Photo/pyramid.png',
      imageAlt: 'Pyramids Half-Day Adventure',
    },
  ];

  openFilters(): void {
    this.isFilterOpen.set(true);
  }

  closeFilters(): void {
    this.isFilterOpen.set(false);
  }

  toggleFilters(): void {
    this.isFilterOpen.update((v) => !v);
  }
}
