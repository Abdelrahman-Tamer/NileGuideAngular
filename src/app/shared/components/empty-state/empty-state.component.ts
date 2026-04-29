import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div
      class="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface-2)] px-6 py-12 text-center"
      role="status"
    >
      <i class="{{ icon }} text-3xl text-yellow-400/70" aria-hidden="true"></i>
      <p class="text-base font-semibold text-white">{{ title }}</p>
      @if (message) {
        <p class="max-w-md text-sm text-zinc-400">{{ message }}</p>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon = 'fa-regular fa-folder-open';
  @Input() title = 'Nothing here yet';
  @Input() message?: string;
}
