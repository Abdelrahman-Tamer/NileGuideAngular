import { AfterViewInit, Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NATIONALITIES } from '../../core/constants/nationalities';
import { DateRangePicker } from 'flowbite-datepicker';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements AfterViewInit {
  NATIONALITIES = NATIONALITIES;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const el = document.getElementById('date-range-picker');

    if (el) {
      new DateRangePicker(el, {
        format: 'mm/dd/yyyy',
        autohide: true,
      });
    }
  }
}