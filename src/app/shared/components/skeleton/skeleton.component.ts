import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <span
      class="block animate-pulse rounded-[var(--radius-md)] bg-white/5"
      [style.height]="height"
      [style.width]="width"
      aria-hidden="true"
    ></span>
  `,
})
export class SkeletonComponent {
  @Input() height = '1rem';
  @Input() width = '100%';
}
