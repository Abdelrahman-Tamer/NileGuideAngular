import { AfterViewInit, Component } from '@angular/core';
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

  ngAfterViewInit(): void {
    const el = document.getElementById('date-range-picker');

    if (el) {
      new DateRangePicker(el, {
        format: 'mm/dd/yyyy',
        autohide: true,
      });
    }
  }
}