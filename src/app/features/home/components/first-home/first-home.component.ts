import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';

import { ActivityCity } from '../../../activities/activities.interfaces';
import { ActivitiesService } from '../../../activities/activities.service';

interface AncientCityCard {
  cityID: number;
  cityName: string;
  subtitle: string;
  imageUrl: string;
  activitiesCount: number;
  order: number;
}

@Component({
  selector: 'app-first-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './first-home.component.html',
  styleUrls: ['./first-home.component.css'],
})
export class FirstHomeComponent implements OnInit {
  private readonly activitiesService = inject(ActivitiesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);

  isLoading = true;
  errorMessage = '';
  cityCards: AncientCityCard[] = [];

  private readonly cityMeta: Record<
    string,
    { subtitle: string; imageUrl: string; order: number }
  > = {
    cairo: {
      subtitle: 'The City of a Thousand Minarets',
      imageUrl: '/Photo/Cairo.png',
      order: 1,
    },
    luxor: {
      subtitle: "World's Greatest Open Air Museum",
      imageUrl: '/Photo/Luxor.png',
      order: 2,
    },
    aswan: {
      subtitle: 'Nubian Culture & The Nile',
      imageUrl: '/Photo/Aswan.png',
      order: 3,
    },
    giza: {
      subtitle: 'Home of the Great Pyramids',
      imageUrl: '/Photo/pyramid.png',
      order: 4,
    },
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading = false;
      return;
    }

    this.loadAncientCities();
  }

  private loadAncientCities(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cityCards = [];
    this.cdr.detectChanges();

    this.activitiesService
      .getCities()
      .pipe(
        catchError((error) => {
          console.error('Cities API error:', error);
          this.errorMessage = 'Failed to load cities.';
          return of([] as ActivityCity[]);
        }),

        map((cities) =>
          cities
            .filter((city) => this.cityMeta[city.cityName.toLowerCase()])
            .sort(
              (a, b) =>
                this.cityMeta[a.cityName.toLowerCase()].order -
                this.cityMeta[b.cityName.toLowerCase()].order
            )
            .slice(0, 4)
        ),

        switchMap((cities) => {
          if (!cities.length) {
            return of([] as AncientCityCard[]);
          }

          const cityRequests = cities.map((city) =>
            this.activitiesService
              .getActivities({
                cityIds: [city.cityID],
                page: 1,
                pageSize: 1,
              })
              .pipe(
                map((response) =>
                  this.mapCityToCard(city, response.totalCount ?? 0)
                ),
                catchError((error) => {
                  console.error(
                    `Activities count error for ${city.cityName}:`,
                    error
                  );

                  return of(this.mapCityToCard(city, 0));
                })
              )
          );

          return forkJoin(cityRequests);
        }),

        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (cards) => {
          this.cityCards = cards
            .filter((city) => city.activitiesCount > 0)
            .sort((a, b) => a.order - b.order);

          if (!this.cityCards.length && !this.errorMessage) {
            this.errorMessage = 'No cities available right now.';
          }

          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Ancient cities load error:', error);

          this.cityCards = [];
          this.errorMessage = 'Failed to load cities.';
          this.cdr.detectChanges();
        },
      });
  }

  private mapCityToCard(
    city: ActivityCity,
    activitiesCount: number
  ): AncientCityCard {
    const cityKey = city.cityName.toLowerCase();
    const meta = this.cityMeta[cityKey];

    return {
      cityID: city.cityID,
      cityName: city.cityName,
      subtitle: meta.subtitle,
      imageUrl: meta.imageUrl,
      order: meta.order,
      activitiesCount,
    };
  }
}