import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageContext } from '../../../../engine/navigation/page-context.service';

@Component({
  selector: 'docs-not-found-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-4 py-24 text-center">
      <p class="text-sm font-medium text-[var(--docs-fg-muted)]">404</p>
      <h1 class="text-2xl font-bold">Page not found</h1>
      <p class="max-w-sm text-[var(--docs-fg-muted)]">
        This page doesn't exist. Try search, or head back to the homepage.
      </p>
      <a
        routerLink="/"
        class="mt-2 rounded-md px-4 py-2 text-sm font-medium text-[var(--docs-brand-contrast)]"
        style="background-color: var(--docs-brand)"
        >Back to home</a
      >
    </div>
  `,
})
export class NotFoundPage {
  constructor() {
    inject(PageContext).setTitle(null);
  }
}
