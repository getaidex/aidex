import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageContext } from '../../../../engine/navigation/page-context.service';

/** Honest placeholder — no generated API reference exists yet, and this page says so rather than faking one. */
@Component({
  selector: 'docs-reference-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="docs-page">
      <h1 class="text-3xl font-bold tracking-tight">API Reference</h1>
      <p class="mt-4 max-w-xl text-[var(--docs-fg-muted)]">
        A full generated API reference is coming in v2 — for now, each package page renders its own README with
        real usage examples, and every example page links back to the packages it exercises.
      </p>
      <div class="mt-6 flex gap-3">
        <a
          routerLink="/packages"
          class="rounded-md px-4 py-2 text-sm font-medium text-[var(--docs-brand-contrast)]"
          style="background-color: var(--docs-brand)"
          >Browse packages</a
        >
        <a
          routerLink="/examples"
          class="rounded-md border border-[var(--docs-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--docs-bg-subtle)]"
          >Browse examples</a
        >
      </div>
    </article>
  `,
})
export class ReferencePage {
  constructor() {
    inject(PageContext).setTitle(null);
  }
}
