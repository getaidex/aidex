import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RelatedLink } from '../content/content.types';

/** Prev/next footer nav. The caller computes which links (if any) apply. */
@Component({
  selector: 'docs-page-nav',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (prev() || next()) {
      <nav
        class="mt-10 flex flex-col gap-3 border-t border-[var(--docs-border)] pt-6 sm:flex-row sm:justify-between"
        aria-label="Page navigation"
      >
        @if (prev(); as p) {
          <a [routerLink]="p.path" class="group flex flex-col text-sm">
            <span class="text-[var(--docs-fg-muted)]">← Previous</span>
            <span class="font-medium text-[var(--docs-fg)] group-hover:text-[var(--docs-brand)]">{{ p.label }}</span>
          </a>
        } @else {
          <span></span>
        }
        @if (next(); as n) {
          <a [routerLink]="n.path" class="group flex flex-col text-sm sm:text-right">
            <span class="text-[var(--docs-fg-muted)]">Next →</span>
            <span class="font-medium text-[var(--docs-fg)] group-hover:text-[var(--docs-brand)]">{{ n.label }}</span>
          </a>
        }
      </nav>
    }
  `,
})
export class PageNav {
  readonly prev = input<RelatedLink | null>(null);
  readonly next = input<RelatedLink | null>(null);
}
