import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Badge } from '../content/content.types';

const TONE_CLASSES: Record<Badge['tone'], string> = {
  neutral: 'bg-[var(--docs-bg-subtle)] text-[var(--docs-fg-muted)] border-[var(--docs-border)]',
  positive: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
};

/** Renders a row of small metadata badges. Generic — the caller decides what the badges mean. */
@Component({
  selector: 'docs-badge-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap gap-2">
      @for (badge of badges(); track badge.label) {
        <span
          class="rounded-full border px-2.5 py-0.5 text-xs font-medium"
          [class]="toneClass(badge.tone)"
          [attr.title]="badge.title ?? null"
        >
          {{ badge.label }}
        </span>
      }
    </div>
  `,
})
export class BadgeList {
  readonly badges = input.required<Badge[]>();

  protected toneClass(tone: Badge['tone']): string {
    return TONE_CLASSES[tone];
  }
}
