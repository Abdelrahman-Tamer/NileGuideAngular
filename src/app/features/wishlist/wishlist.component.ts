import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

interface WishlistCard {
  id: number;
  title: string;
  category: string;
  rating: number;
  ratingCount: number;
  description: string;
  startingFrom: string;
  image: string;
  imageAlt: string;
}

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.css',
})
export class WishlistComponent {
  readonly items = signal<WishlistCard[]>([
    {
      id: 1,
      title: 'Grand Egyptian Museum VIP',
      category: 'Museum',
      rating: 5.0,
      ratingCount: 89,
      description:
        'Early access to Egypt’s iconic museum with a curated VIP cultural experience.',
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
      startingFrom: '$45',
      image: '/Photo/Cairo.png',
      imageAlt: 'Cairo Old Town Walk',
    },
    {
      id: 3,
      title: 'Aswan Sunset Cruise',
      category: 'Nile Cruise',
      rating: 4.9,
      ratingCount: 210,
      description:
        'Sail the Nile at golden hour aboard a traditional felucca with light refreshments.',
      startingFrom: '$60',
      image: '/Photo/Aswan.png',
      imageAlt: 'Aswan Sunset Cruise',
    },
  ]);

  remove(id: number): void {
    this.items.update((list) => list.filter((i) => i.id !== id));
  }

  clearAll(): void {
    this.items.set([]);
  }
}
