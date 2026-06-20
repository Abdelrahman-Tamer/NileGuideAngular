import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  NgZone,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ActivitiesService } from '../activities/activities.service';
import { ActivityDetails } from '../activities/activities.interfaces';
import { ScheduleService } from '../schedule/schedule.service';
import { ScheduleItemResponse } from '../schedule/schedule.interfaces';
import { environment } from '../../../environments/environment';

export interface MapScheduleItem {
  activityId: number;
  activityName: string;
  city: string;
  day: string;
  lat: number;
  lng: number;
  image: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
}

declare const google: any;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  mapContainer!: ElementRef<HTMLDivElement>;

  private readonly scheduleService = inject(ScheduleService);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly cdr = inject(ChangeDetectorRef);

  private map: any = null;
  private markers: any[] = [];
  private infoWindows: any[] = [];

  selectedIndex: number | null = null;
  selectedCity = 'all';
  isLoading = true;
  mapConfigError = '';

  scheduleItems: MapScheduleItem[] = [];

  private readonly egyptCenter = { lat: 26.8206, lng: 30.8025 };

  private readonly mapStyles = [
    { elementType: 'geometry', stylers: [{ color: '#0C0C0C' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0C0C0C' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#C6A664' }] },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#C6A664' }],
    },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#C6A664' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f1f1f' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0C0C0C' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#F4EAD5' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#B68C40' }] },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#C6A664' }],
    },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#003B73' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#C6A664' }] },
  ];

  get filteredItems(): MapScheduleItem[] {
    if (this.selectedCity === 'all') return this.scheduleItems;
    return this.scheduleItems.filter((item) => item.city === this.selectedCity);
  }

  get availableCities(): string[] {
    return [...new Set(this.scheduleItems.map((item) => item.city))];
  }

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.clearMarkers();
  }

  private loadData(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.scheduleService.getSchedule().subscribe({
      next: (response) => {
        const scheduleItems = response.items ?? [];

        if (!scheduleItems.length) {
          this.scheduleItems = [];
          this.isLoading = false;
          this.cdr.detectChanges();
          this.loadGoogleMapsScript();
          return;
        }

        const detailRequests = scheduleItems.map((item) =>
          this.activitiesService.getActivityById(item.activityId).pipe(
            map((details: ActivityDetails) => this.mapToMapScheduleItem(item, details)),
            catchError(() => of(null))
          )
        );

        forkJoin(detailRequests).subscribe({
          next: (items) => {
            this.scheduleItems = items
              .filter((item): item is MapScheduleItem => item !== null)
              .filter((item) => this.hasValidCoordinates(item))
              .sort((a, b) => {
                const dateCompare = a.scheduledDate.localeCompare(b.scheduledDate);
                if (dateCompare !== 0) return dateCompare;
                return a.startTime.localeCompare(b.startTime);
              });

            this.isLoading = false;
            this.cdr.detectChanges();
            this.loadGoogleMapsScript();
          },
          error: () => {
            this.scheduleItems = [];
            this.isLoading = false;
            this.cdr.detectChanges();
            this.loadGoogleMapsScript();
          },
        });
      },
      error: () => {
        this.scheduleItems = [];
        this.isLoading = false;
        this.cdr.detectChanges();
        this.loadGoogleMapsScript();
      },
    });
  }

  private mapToMapScheduleItem(
    scheduleItem: ScheduleItemResponse,
    details: ActivityDetails
  ): MapScheduleItem {
    return {
      activityId: scheduleItem.activityId,
      activityName: scheduleItem.activityName,
      city: scheduleItem.cityName,
      day: this.formatDisplayDate(scheduleItem.scheduledDate),
      lat: details.latitude,
      lng: details.longitude,
      image:
        details.images?.[0] ||
        'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&q=80&w=300',
      scheduledDate: scheduleItem.scheduledDate,
      startTime: scheduleItem.startTime,
      endTime: scheduleItem.endTime,
    };
  }

  private hasValidCoordinates(item: MapScheduleItem): boolean {
    return (
      typeof item.lat === 'number' &&
      typeof item.lng === 'number' &&
      !Number.isNaN(item.lat) &&
      !Number.isNaN(item.lng) &&
      item.lat !== 0 &&
      item.lng !== 0
    );
  }

  private loadGoogleMapsScript(): void {
    if (typeof google !== 'undefined' && google.maps) {
      this.initMap();
      return;
    }

    const callbackName = '__mapInitCallback__';
    (window as any)[callbackName] = () => {
      this.ngZone.run(() => {
        this.initMap();
        this.cdr.detectChanges();
      });
    };

    if (!document.querySelector('#google-maps-script')) {
      if (!environment.googleMapsApiKey) {
        this.mapConfigError = 'Google Maps API key is not configured.';
        this.cdr.detectChanges();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  private initMap(): void {
    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: this.egyptCenter,
      zoom: 6,
      styles: this.mapStyles,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      backgroundColor: '#0C0C0C',
    });

    this.buildMarkers(this.scheduleItems);
    this.cdr.detectChanges();
  }

  private buildMarkers(items: MapScheduleItem[]): void {
    this.clearMarkers();

    items.forEach((item, index) => {
      const marker = new google.maps.Marker({
        position: { lat: item.lat, lng: item.lng },
        map: this.map,
        title: item.activityName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#D4AF37',
          fillOpacity: 1,
          strokeColor: '#F4EAD5',
          strokeWeight: 3,
        },
        animation: google.maps.Animation.DROP,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="color:#0C0C0C;padding:12px;font-family:'Plus Jakarta Sans',sans-serif;">
            <h3 style="font-weight:bold;margin:0 0 6px 0;font-size:15px;color:#D4AF37;">${item.activityName}</h3>
            <p style="font-size:13px;color:#666;margin:0;">${item.city} • ${item.day}</p>
          </div>`,
      });

      marker.addListener('click', () => {
        this.ngZone.run(() => {
          this.selectItem(index);
          this.cdr.detectChanges();
        });
      });

      this.markers.push(marker);
      this.infoWindows.push(infoWindow);
    });

    if (items.length === 1) {
      this.map.panTo({ lat: items[0].lat, lng: items[0].lng });
      this.map.setZoom(12);
      this.cdr.detectChanges();
      return;
    }

    if (items.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      items.forEach((item) => bounds.extend({ lat: item.lat, lng: item.lng }));
      this.map.fitBounds(bounds);

      google.maps.event.addListenerOnce(this.map, 'bounds_changed', () => {
        this.ngZone.run(() => {
          if (this.map.getZoom() > 12) {
            this.map.setZoom(12);
          }
          this.cdr.detectChanges();
        });
      });
    }
  }

  private clearMarkers(): void {
    this.markers.forEach((m) => m.setMap(null));
    this.markers = [];
    this.infoWindows = [];
  }

  onCityChange(): void {
    const city = this.selectedCity;
    this.selectedIndex = null;

    this.markers.forEach((marker, index) => {
      const item = this.scheduleItems[index];
      const visible = city === 'all' || item.city === city;
      marker.setMap(visible ? this.map : null);
    });

    if (city !== 'all' && this.filteredItems.length > 0) {
      if (this.filteredItems.length === 1) {
        this.map.panTo({
          lat: this.filteredItems[0].lat,
          lng: this.filteredItems[0].lng,
        });
        this.map.setZoom(12);
      } else {
        const bounds = new google.maps.LatLngBounds();
        this.filteredItems.forEach((item) =>
          bounds.extend({ lat: item.lat, lng: item.lng })
        );
        this.map.fitBounds(bounds);
      }
    } else {
      this.centerMap();
    }

    this.cdr.detectChanges();
  }

  selectItem(originalIndex: number): void {
    if (!this.map) return;
    this.selectedIndex = originalIndex;

    const item = this.scheduleItems[originalIndex];
    this.map.panTo({ lat: item.lat, lng: item.lng });
    this.map.setZoom(13);

    this.infoWindows.forEach((iw) => iw.close());
    this.infoWindows[originalIndex]?.open(this.map, this.markers[originalIndex]);

    this.cdr.detectChanges();
  }

  centerMap(): void {
    if (!this.map) return;

    if (this.filteredItems.length === 1) {
      this.map.panTo({
        lat: this.filteredItems[0].lat,
        lng: this.filteredItems[0].lng,
      });
      this.map.setZoom(12);
    } else if (this.filteredItems.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      this.filteredItems.forEach((item) =>
        bounds.extend({ lat: item.lat, lng: item.lng })
      );
      this.map.fitBounds(bounds);
    } else {
      this.map.panTo(this.egyptCenter);
      this.map.setZoom(6);
    }

    this.infoWindows.forEach((iw) => iw.close());
    this.selectedIndex = null;
    this.cdr.detectChanges();
  }

  toggleMapType(): void {
    if (!this.map) return;
    const current = this.map.getMapTypeId();
    this.map.setMapTypeId(current === 'roadmap' ? 'satellite' : 'roadmap');
    this.cdr.detectChanges();
  }

  getOriginalIndex(item: MapScheduleItem): number {
    return this.scheduleItems.indexOf(item);
  }

  isSelected(originalIndex: number): boolean {
    return this.selectedIndex === originalIndex;
  }

  formatDisplayDate(date: string): string {
    const parsed = new Date(`${date}T00:00:00`);
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
