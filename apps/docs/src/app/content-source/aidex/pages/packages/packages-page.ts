import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnimatedIcon } from '../../../../engine/motion/animated-icon';
import { RevealOnScroll } from '../../../../engine/motion/reveal-on-scroll.directive';
import { PageContext } from '../../../../engine/navigation/page-context.service';
import { packageIconKind } from '../../icon-mapping';
import type { PackageDoc } from '../../types';

import packagesData from '../../../../content/generated/packages.json';

const packages = packagesData as PackageDoc[];
const CATEGORIES = ['All', ...Array.from(new Set(packages.map((p) => p.category)))];

/** A searchable, filterable index of every published Aidex package — this page doubles as the API index. */
@Component({
  selector: 'docs-packages-page',
  standalone: true,
  imports: [RouterLink, AnimatedIcon, RevealOnScroll],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="docs-page">
      <h1 class="text-3xl font-bold tracking-tight">Packages</h1>
      <p class="mt-2 max-w-2xl text-[var(--docs-fg-muted)]">
        All {{ packages.length }} published <code>&#64;aidex/*</code> packages. Install only what you need.
      </p>

      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search packages..."
          class="w-full rounded-md border border-[var(--docs-border)] bg-[var(--docs-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--docs-brand)] sm:max-w-xs"
          [value]="query()"
          (input)="query.set(inputValue($event))"
        />
        <div class="flex flex-wrap gap-2">
          @for (category of categories; track category) {
            <button
              type="button"
              class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              [class]="
                category === activeCategory()
                  ? 'border-[var(--docs-brand)] bg-[var(--docs-brand)] text-[var(--docs-brand-contrast)]'
                  : 'border-[var(--docs-border)] text-[var(--docs-fg-muted)] hover:text-[var(--docs-fg)]'
              "
              (click)="activeCategory.set(category)"
            >
              {{ category }}
            </button>
          }
        </div>
      </div>

      <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        @for (pkg of filteredPackages(); track pkg.slug; let i = $index) {
          <a
            [routerLink]="['/packages', pkg.slug]"
            docsReveal
            [docsRevealDelay]="(i % 6) * 50"
            class="docs-hover-lift flex flex-col gap-2 rounded-lg border border-[var(--docs-border)] p-4 hover:border-[var(--docs-brand)]"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <docs-animated-icon [kind]="packageIcon(pkg.slug)" class="h-5 w-5 text-[var(--docs-brand)]" />
                <span class="font-medium">{{ pkg.name }}</span>
              </div>
              <span class="shrink-0 text-xs text-[var(--docs-fg-muted)]">v{{ pkg.version }}</span>
            </div>
            <p class="line-clamp-2 text-sm text-[var(--docs-fg-muted)]">{{ pkg.description }}</p>
            <span class="mt-1 w-fit rounded-full bg-[var(--docs-bg-subtle)] px-2 py-0.5 text-xs text-[var(--docs-fg-muted)]">{{
              pkg.category
            }}</span>
          </a>
        }
        @if (filteredPackages().length === 0) {
          <p class="col-span-full py-10 text-center text-sm text-[var(--docs-fg-muted)]">
            No packages match "{{ query() }}".
          </p>
        }
      </div>
    </article>
  `,
})
export class PackagesPage {
  protected readonly packages = packages;
  protected readonly categories = CATEGORIES;
  protected readonly query = signal('');
  protected readonly activeCategory = signal('All');

  protected readonly filteredPackages = computed(() => {
    const query = this.query().trim().toLowerCase();
    const category = this.activeCategory();
    return packages.filter((pkg) => {
      const matchesCategory = category === 'All' || pkg.category === category;
      const matchesQuery =
        !query ||
        pkg.name.toLowerCase().includes(query) ||
        pkg.description.toLowerCase().includes(query) ||
        pkg.keywords.some((k) => k.toLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });
  });

  constructor() {
    inject(PageContext).setTitle(null);
  }

  protected inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected packageIcon(slug: string) {
    return packageIconKind(slug);
  }
}
