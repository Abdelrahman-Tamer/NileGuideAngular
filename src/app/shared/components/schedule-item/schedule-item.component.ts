import { Component, Input } from '@angular/core';

export interface ScheduleItemData {
  id: string | number;
  time: string;
  date: string;
  title: string;
  description: string;
  location: string;
  duration: string;
  cost: string;
  crowd: 'Low' | 'Medium' | 'High';
  idRequired: boolean;
  bookingIcons: string[];
}

@Component({
  selector: 'app-schedule-item',
  standalone: true,
  templateUrl: './schedule-item.component.html',
})
export class ScheduleItemComponent {
  @Input({ required: true }) item!: ScheduleItemData;

  get crowdClasses(): string {
    switch (this.item.crowd) {
      case 'Low':
        return 'bg-green-500/10 text-green-400';
      case 'Medium':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'High':
        return 'bg-red-500/10 text-red-400';
    }
  }

  get idClasses(): string {
    return this.item.idRequired
      ? 'bg-green-500/10 text-green-400'
      : 'bg-red-500/10 text-red-400';
  }
}
