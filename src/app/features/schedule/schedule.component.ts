import { Component, signal } from '@angular/core';
import {
  ScheduleItemComponent,
  ScheduleItemData,
} from '../../shared/components/schedule-item/schedule-item.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [ScheduleItemComponent, EmptyStateComponent],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.css',
})
export class ScheduleComponent {
  readonly activities = signal<ScheduleItemData[]>([
    {
      id: 1,
      time: '08:00 AM',
      date: 'Oct 6, 2023',
      title: 'Pyramids of Giza Tour',
      description: 'Private guided tour with Egyptologist',
      location: 'Giza',
      duration: '5 hours',
      cost: '$80',
      crowd: 'Low',
      idRequired: true,
      bookingIcons: ['fa-link', 'fa-arrow-up-right-from-square'],
    },
    {
      id: 2,
      time: '01:30 PM',
      date: 'Oct 6, 2023',
      title: 'Egyptian Museum',
      description: 'Explore ancient artifacts and treasures',
      location: 'Cairo',
      duration: '3 hours',
      cost: '$45',
      crowd: 'Medium',
      idRequired: false,
      bookingIcons: ['fa-link', 'fa-globe'],
    },
  ]);

  get totals() {
    const items = this.activities();
    const totalCost = items.reduce(
      (sum, i) => sum + Number(i.cost.replace(/[^0-9.]/g, '') || 0),
      0,
    );
    return {
      count: items.length,
      duration: items.length > 0 ? '30+ hrs' : '0 hrs',
      cost: `$${totalCost.toLocaleString()}`,
    };
  }
}
