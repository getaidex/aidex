import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { DOCS_SITE_CONFIG } from '../config/site-config';
import { Breadcrumbs } from '../navigation/breadcrumbs';
import { NavigationTree } from '../navigation/navigation-tree';
import { SearchModal } from '../search/search-modal';
import { SearchUiState } from '../search/search-ui-state.service';
import { ThemeToggle } from '../ui/theme-toggle';

/**
 * The whole-page shell: top bar, collapsible sidebar, breadcrumbs, and the
 * routed page content. Knows the site title/nav only through DOCS_SITE_CONFIG
 * — nothing about pages or content is hardcoded here.
 */
@Component({
  selector: 'docs-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet, NavigationTree, Breadcrumbs, ThemeToggle, SearchModal, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#docs-main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--docs-brand)] focus:px-3 focus:py-2 focus:text-[var(--docs-brand-contrast)]"
    >
      Skip to content
    </a>

    <header
      class="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--docs-border)] bg-[var(--docs-bg)]/95 px-4 backdrop-blur"
    >
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="rounded-md p-1.5 text-[var(--docs-fg-muted)] hover:text-[var(--docs-fg)] lg:hidden"
          aria-label="Toggle navigation"
          (click)="sidebarOpen.set(!sidebarOpen())"
        >
          ☰
        </button>
        <a routerLink="/" class="flex items-center gap-2 font-semibold">
          <ng-container [ngComponentOutlet]="config.logoComponent" />
          <span>{{ config.title }}</span>
        </a>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="hidden items-center gap-2 rounded-md border border-[var(--docs-border)] px-3 py-1.5 text-sm text-[var(--docs-fg-muted)] hover:text-[var(--docs-fg)] sm:flex"
          (click)="searchUi.open()"
        >
          <span aria-hidden="true">🔍</span>
          <span>Search</span>
          <kbd class="rounded border border-[var(--docs-border)] px-1 text-xs">⌘K</kbd>
        </button>
        <button
          type="button"
          class="rounded-md p-1.5 text-[var(--docs-fg-muted)] hover:text-[var(--docs-fg)] sm:hidden"
          aria-label="Search"
          (click)="searchUi.open()"
        >
          🔍
        </button>
        <a
          [href]="config.githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-md p-1.5 text-[var(--docs-fg-muted)] hover:text-[var(--docs-fg)]"
          aria-label="GitHub repository"
        >
          <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path
              d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38l-.01-1.49c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.17-.89-1.17-.72-.5.06-.49.06-.49.8.06 1.22.82 1.22.82.71 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.96 0-.88.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.08-1.87 3.75-3.66 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
        </a>
        <docs-theme-toggle />
      </div>
    </header>

    @if (sidebarOpen()) {
      <div
        class="fixed inset-0 z-30 cursor-pointer bg-black/40 lg:hidden"
        (click)="sidebarOpen.set(false)"
        aria-hidden="true"
      ></div>
    }

    <div class="mx-auto max-w-7xl lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
      <aside
        class="fixed inset-y-0 left-0 top-14 z-40 w-72 overflow-y-auto border-r border-[var(--docs-border)] bg-[var(--docs-bg)] p-4 transition-transform duration-200 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-auto lg:translate-x-0 lg:border-r lg:p-6"
        [class]="sidebarOpen() ? 'translate-x-0' : '-translate-x-full'"
      >
        <docs-navigation-tree [tree]="config.nav" (linkClicked)="sidebarOpen.set(false)" />
      </aside>

      <main id="docs-main" class="min-w-0 px-4 py-8 lg:px-0 lg:py-10">
        <docs-breadcrumbs />
        <router-outlet />
      </main>
    </div>

    <docs-search-modal />
  `,
})
export class DocsShell {
  protected readonly config = inject(DOCS_SITE_CONFIG);
  protected readonly searchUi = inject(SearchUiState);
  protected readonly sidebarOpen = signal(false);
}
