import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ActivitiesService } from '../activities/activities.service';
import { ActivityDetails } from '../activities/activities.interfaces';
import { ScheduleService } from './schedule.service';
import {
  ScheduleBookingLink,
  ScheduleItem,
  ScheduleItemResponse,
} from './schedule.interfaces';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.css',
})
export class ScheduleComponent implements OnInit {
  private readonly scheduleService = inject(ScheduleService);
  private readonly activitiesService = inject(ActivitiesService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);

  scheduleItems: ScheduleItem[] = [];
  isLoading = false;
  removingIds = new Set<number>();

  ngOnInit(): void {
    this.getSchedule();
  }

  get totalActivities(): number {
    return this.scheduleItems.length;
  }

  get totalDurationText(): string {
    const totalMinutes = this.scheduleItems.reduce(
      (sum, item) => sum + item.durationMinutes,
      0
    );

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    return `${minutes}m`;
  }

  get totalCost(): number {
    return this.scheduleItems.reduce((sum, item) => sum + item.price, 0);
  }

  getSchedule(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.scheduleService.getSchedule().subscribe({
      next: (response) => {
        this.enrichScheduleItems(response.items ?? []);
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Failed to load schedule');
        this.cdr.detectChanges();
      },
    });
  }

  enrichScheduleItems(items: ScheduleItemResponse[]): void {
    if (!items.length) {
      this.scheduleItems = [];
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    const requests = items.map((item) =>
      this.activitiesService.getActivityById(item.activityId).pipe(
        map((details: ActivityDetails) => ({
          ...item,
          openTime: details.openingHours?.[0]?.openTime ?? '--',
          closeTime: details.openingHours?.[0]?.closeTime ?? '--',
        })),
        catchError(() =>
          of({
            ...item,
            openTime: '--',
            closeTime: '--',
          })
        )
      )
    );

    forkJoin(requests).subscribe({
      next: (enrichedItems) => {
        this.scheduleItems = enrichedItems.sort((a, b) => {
          const dateCompare = a.scheduledDate.localeCompare(b.scheduledDate);
          if (dateCompare !== 0) return dateCompare;
          return a.startTime.localeCompare(b.startTime);
        });

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.scheduleItems = items as ScheduleItem[];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  removeFromSchedule(planItemId: number): void {
    if (this.removingIds.has(planItemId)) return;

    this.removingIds.add(planItemId);
    this.cdr.detectChanges();

    this.scheduleService.removeFromSchedule(planItemId).subscribe({
      next: () => {
        this.scheduleItems = this.scheduleItems.filter(
          (item) => item.planItemId !== planItemId
        );
        this.removingIds.delete(planItemId);
        this.toastr.info('Removed from schedule');
        this.cdr.detectChanges();
      },
      error: () => {
        this.removingIds.delete(planItemId);
        this.toastr.error('Failed to remove from schedule');
        this.cdr.detectChanges();
      },
    });
  }

  isRemoving(planItemId: number): boolean {
    return this.removingIds.has(planItemId);
  }

  formatDisplayDate(date: string): string {
    const parsed = new Date(`${date}T00:00:00`);
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatDisplayTime(time24: string): string {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    let hours12 = hours % 12;

    if (hours12 === 0) {
      hours12 = 12;
    }

    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  getDurationLabel(durationMinutes: number): string {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    return `${minutes}m`;
  }

  getBookingIcon(link: ScheduleBookingLink): string {
    const name = link.providerName.toLowerCase();

    if (name.includes('viator')) return 'fa-solid fa-link';
    if (name.includes('getyourguide')) return 'fa-solid fa-plane-departure';
    if (name.includes('tripadvisor')) return 'fa-solid fa-globe';

    return 'fa-solid fa-arrow-up-right-from-square';
  }

  exportSchedule(): void {
    if (!this.scheduleItems.length) {
      this.toastr.info('No schedule items to export');
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.text('My Egypt Schedule', 14, 18);

    doc.setFontSize(11);
    doc.text(`Total Activities: ${this.totalActivities}`, 14, 28);
    doc.text(`Total Duration: ${this.totalDurationText}`, 78, 28);
    doc.text(`Total Cost: $${this.totalCost}`, 142, 28);

    const tableRows = this.scheduleItems.map((item) => [
      this.formatDisplayDate(item.scheduledDate),
      `${this.formatDisplayTime(item.startTime)} - ${this.formatDisplayTime(item.endTime)}`,
      item.activityName,
      item.cityName,
      item.openTime || '--',
      item.closeTime || '--',
      this.getDurationLabel(item.durationMinutes),
      `$${item.price}`,
    ]);

    autoTable(doc, {
      startY: 36,
      head: [[
        'Date',
        'Time',
        'Activity',
        'Location',
        'Open',
        'Close',
        'Duration',
        'Cost',
      ]],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [224, 177, 0],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 28 },
        2: { cellWidth: 52 },
        3: { cellWidth: 22 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
        7: { cellWidth: 16 },
      },
      didDrawPage: () => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(9);
        doc.text(
          `Page ${pageCount}`,
          pageWidth - 25,
          doc.internal.pageSize.getHeight() - 8
        );
      },
    });

    doc.save('my-egypt-schedule.pdf');
    this.toastr.success('PDF downloaded');
  }
}