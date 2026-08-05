import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { DOCS_SITE_CONFIG } from '../config/site-config';
import { PageContext } from './page-context.service';

interface Crumb {
  label: string;
  path: string | null;
}

/** Home > Section > (optional dynamic page title, set via PageContext). Generic over any nav tree. */
@Component({
  selector: 'docs-breadcrumbs',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (crumbs().length > 1) {
      <nav
        aria-label="Breadcrumb"
        class="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-[var(--docs-fg-muted)]"
      >
        @for (crumb of crumbs(); track $index) {
          @if (crumb.path) {
            <a [routerLink]="crumb.path" class="hover:text-[var(--docs-fg)]">{{ crumb.label }}</a>
            <span aria-hidden="true">/</span>
          } @else {
            <span class="text-[var(--docs-fg)]" aria-current="page">{{ crumb.label }}</span>
          }
        }
      </nav>
    }
  `,
})
export class Breadcrumbs {
  private readonly config = inject(DOCS_SITE_CONFIG);
  private readonly pageContext = inject(PageContext);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  protected readonly crumbs = computed<Crumb[]>(() => {
    const url = this.url().split('?')[0].split('#')[0];
    const crumbs: Crumb[] = [{ label: 'Home', path: '/' }];
    if (url === '/') return crumbs;

    for (const section of this.config.nav.sections) {
      const leaf = section.children.find((c) => c.path === url || url.startsWith(c.path + '/'));
      if (leaf) {
        crumbs.push({ label: leaf.label, path: url === leaf.path ? null : leaf.path });
        break;
      }
    }

    const dynamicTitle = this.pageContext.title();
    const last = crumbs[crumbs.length - 1];
    if (dynamicTitle && crumbs.length > 1 && last.path !== null) {
      crumbs.push({ label: dynamicTitle, path: null });
    }

    return crumbs;
  });
}
