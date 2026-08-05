import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { NavTree } from './navigation.types';

/** Renders a sidebar nav tree from data. Has no idea what pages exist beyond what it's given. */
@Component({
  selector: 'docs-navigation-tree',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex flex-col gap-6" aria-label="Section navigation">
      @for (section of tree().sections; track section.label) {
        <div>
          <p class="px-2 text-xs font-semibold uppercase tracking-wide text-[var(--docs-fg-muted)]">
            {{ section.label }}
          </p>
          <ul class="mt-1.5 flex flex-col gap-0.5">
            @for (leaf of section.children; track leaf.path) {
              <li>
                <a
                  [routerLink]="leaf.path"
                  routerLinkActive="bg-[var(--docs-bg-subtle)] text-[var(--docs-brand)] font-medium"
                  [routerLinkActiveOptions]="{ exact: leaf.path === '/' }"
                  (click)="linkClicked.emit()"
                  class="block rounded-md px-2 py-1.5 text-sm text-[var(--docs-fg-muted)] hover:bg-[var(--docs-bg-subtle)] hover:text-[var(--docs-fg)]"
                  >{{ leaf.label }}</a
                >
              </li>
            }
          </ul>
        </div>
      }
    </nav>
  `,
})
export class NavigationTree {
  readonly tree = input.required<NavTree>();
  readonly linkClicked = output<void>();
}
