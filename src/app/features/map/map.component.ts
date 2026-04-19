import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  NgZone,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// ─── Interface ───────────────────────────────────────────────────────────────
export interface ScheduleItem {
  activityName: string;
  city: string;
  day: string;
  lat: number;
  lng: number;
  image: string;
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
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private map: any = null;
  private markers: any[] = [];
  private infoWindows: any[] = [];

  selectedIndex: number | null = null;
  selectedCity = 'all';
  isLoading = true;

  scheduleItems: ScheduleItem[] = [];

  private readonly staticItems: ScheduleItem[] = [
    { activityName: 'Pyramids of Giza Tour',  city: 'Cairo',           day: 'Day 1', lat: 29.9792, lng: 31.1342, image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&q=80&w=300' },
    { activityName: 'Egyptian Museum',         city: 'Cairo',           day: 'Day 1', lat: 30.0478, lng: 31.2336, image: 'https://images.unsplash.com/photo-1572252009289-9b5324392426?auto=format&fit=crop&q=80&w=300' },
    { activityName: 'Khan El-Khalili Bazaar',  city: 'Cairo',           day: 'Day 2', lat: 30.0472, lng: 31.2620, image: 'https://images.unsplash.com/photo-1662499252328-912c1cb41764?auto=format&fit=crop&q=80&w=300' },
    { activityName: 'Hot Air Balloon Ride',    city: 'Luxor',           day: 'Day 3', lat: 25.6872, lng: 32.6396, image: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&q=80&w=300' },
    { activityName: 'Valley of the Kings',     city: 'Luxor',           day: 'Day 3', lat: 25.7402, lng: 32.6014, image: 'https://images.unsplash.com/photo-1503424886307-b090341d2c4c?auto=format&fit=crop&q=80&w=300' },
    { activityName: 'Karnak Temple',           city: 'Luxor',           day: 'Day 4', lat: 25.7188, lng: 32.6573, image: 'https://images.unsplash.com/photo-1501264326535-3f2d0115024d?auto=format&fit=crop&q=80&w=300' },
    { activityName: 'Philae Temple',           city: 'Aswan',           day: 'Day 5', lat: 24.0258, lng: 32.8820, image: 'https://images.unsplash.com/photo-1533512217506-d2fc7636e768?auto=format&fit=crop&q=80&w=300' },
    { activityName: 'Abu Simbel Temples',      city: 'Aswan',           day: 'Day 6', lat: 22.3372, lng: 31.6258, image: 'https://images.unsplash.com/photo-1539650116574-8ef11e3b8552?auto=format&fit=crop&q=80&w=300' },
    { activityName: 'Red Sea Diving',          city: 'Sharm El-Sheikh', day: 'Day 7', lat: 27.9158, lng: 34.3300, image: 'https://images.unsplash.com/photo-1565543793744-8d998d63e9e3?auto=format&fit=crop&q=80&w=300' },
  ];

  private readonly egyptCenter = { lat: 26.8206, lng: 30.8025 };

  private readonly mapStyles = [
    { elementType: 'geometry',           stylers: [{ color: '#0C0C0C' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0C0C0C' }] },
    { elementType: 'labels.text.fill',   stylers: [{ color: '#C6A664' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#C6A664' }] },
    { featureType: 'poi',          elementType: 'labels.text.fill', stylers: [{ color: '#C6A664' }] },
    { featureType: 'poi.park',     elementType: 'geometry',         stylers: [{ color: '#1a1a1a' }] },
    { featureType: 'road',         elementType: 'geometry',         stylers: [{ color: '#1f1f1f' }] },
    { featureType: 'road',         elementType: 'geometry.stroke',  stylers: [{ color: '#0C0C0C' }] },
    { featureType: 'road',         elementType: 'labels.text.fill', stylers: [{ color: '#F4EAD5' }] },
    { featureType: 'road.highway', elementType: 'geometry',         stylers: [{ color: '#B68C40' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke',  stylers: [{ color: '#C6A664' }] },
    { featureType: 'water',        elementType: 'geometry',         stylers: [{ color: '#003B73' }] },
    { featureType: 'water',        elementType: 'labels.text.fill', stylers: [{ color: '#C6A664' }] },
  ];

  // ─── Computed ─────────────────────────────────────────────────────────────
  get filteredItems(): ScheduleItem[] {
    if (this.selectedCity === 'all') return this.scheduleItems;
    return this.scheduleItems.filter(item => item.city === this.selectedCity);
  }

  get availableCities(): string[] {
    return [...new Set(this.scheduleItems.map(item => item.city))];
  }

  constructor(
    private ngZone: NgZone,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    // ✅ الماب لا يُحمَّل في SSR — window/document غير موجودَين على السيرفر
    if (isPlatformBrowser(this.platformId)) {
      this.loadData();
    } else {
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.clearMarkers();
  }

  // ─── Data Loading ─────────────────────────────────────────────────────────
  private loadData(): void {
    this.isLoading = true;

    // ── Static mode (شغّال دلوقتي) ──
    this.scheduleItems = this.staticItems;
    this.isLoading = false;
    this.loadGoogleMapsScript();

    // ── API mode (فعّله لما يكون عندك endpoint) ──
    // this.http.get<ScheduleItem[]>('https://your-api.com/api/schedule').subscribe({
    //   next: (items) => {
    //     this.scheduleItems = items;
    //     this.isLoading = false;
    //     this.loadGoogleMapsScript();
    //   },
    //   error: () => { this.isLoading = false; }
    // });
  }

  // ─── Google Maps Script ───────────────────────────────────────────────────
  // ✅ هذه الدالة بتُستدعى فقط بعد فحص isPlatformBrowser في ngOnInit
  //    لذلك window/document آمنان هنا بدون حاجة لفحص إضافي
  private loadGoogleMapsScript(): void {
    if (typeof google !== 'undefined' && google?.maps) {
      this.initMap();
      return;
    }

    const callbackName = '__mapInitCallback__';

    // ✅ runOutsideAngular: يمنع Angular من تشغيل change detection عند كل event
    //    داخل script injection — تحسين الأداء وتقليل overhead
    this.ngZone.runOutsideAngular(() => {
      (window as any)[callbackName] = () => {
        this.ngZone.run(() => this.initMap());
      };

      if (!document.querySelector('#google-maps-script')) {
        const script = document.createElement('script');
        script.id    = 'google-maps-script';
        script.src   = `https://maps.googleapis.com/maps/api/js?key=AIzaSyD4h36e_ljWxi6V2S4Lf-VsSpgCxP3e7SM&callback=${callbackName}&loading=async`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    });
  }

  // ─── Map Init ─────────────────────────────────────────────────────────────
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
  }

  // ─── Markers ──────────────────────────────────────────────────────────────
  private buildMarkers(items: ScheduleItem[]): void {
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
        this.ngZone.run(() => this.selectItem(index));
      });

      this.markers.push(marker);
      this.infoWindows.push(infoWindow);
    });
  }

  private clearMarkers(): void {
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
    this.infoWindows = [];
  }

  // ─── Filter ───────────────────────────────────────────────────────────────
  onCityChange(): void {
    const city = this.selectedCity;
    this.selectedIndex = null;

    this.markers.forEach((marker, index) => {
      const item = this.scheduleItems[index];
      const visible = city === 'all' || item.city === city;
      marker.setMap(visible ? this.map : null);
    });

    if (city !== 'all' && this.filteredItems.length > 0) {
      this.map.panTo({ lat: this.filteredItems[0].lat, lng: this.filteredItems[0].lng });
      this.map.setZoom(10);
    } else {
      this.centerMap();
    }
  }

  // ─── Item Selection ───────────────────────────────────────────────────────
  selectItem(originalIndex: number): void {
    if (!this.map) return;
    this.selectedIndex = originalIndex;

    const item = this.scheduleItems[originalIndex];
    this.map.panTo({ lat: item.lat, lng: item.lng });
    this.map.setZoom(13);

    this.infoWindows.forEach(iw => iw.close());
    this.infoWindows[originalIndex].open(this.map, this.markers[originalIndex]);
  }

  // ─── Map Controls ─────────────────────────────────────────────────────────
  centerMap(): void {
    if (!this.map) return;
    this.map.panTo(this.egyptCenter);
    this.map.setZoom(6);
    this.infoWindows.forEach(iw => iw.close());
    this.selectedIndex = null;
  }

  toggleMapType(): void {
    if (!this.map) return;
    const current = this.map.getMapTypeId();
    this.map.setMapTypeId(current === 'roadmap' ? 'satellite' : 'roadmap');
  }

  // ─── Template Helpers ─────────────────────────────────────────────────────
  getOriginalIndex(item: ScheduleItem): number {
    return this.scheduleItems.indexOf(item);
  }

  isSelected(originalIndex: number): boolean {
    return this.selectedIndex === originalIndex;
  }
}
