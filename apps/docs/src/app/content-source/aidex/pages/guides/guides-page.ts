import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnimatedIcon } from '../../../../engine/motion/animated-icon';
import { RevealOnScroll } from '../../../../engine/motion/reveal-on-scroll.directive';
import { PageContext } from '../../../../engine/navigation/page-context.service';
import { guideIconKind } from '../../icon-mapping';
import type { GuideDoc } from '../../types';

import guidesData from '../../../../content/generated/guides.json';

const guides = guidesData as GuideDoc[];

/** Task-focused guides for extending Aidex. Each one ends with links back into examples, packages, and architecture. */
@Component({
  selector: 'docs-guides-page',
  standalone: true,
  imports: [RouterLink, AnimatedIcon, RevealOnScroll],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="docs-page">
      <h1 class="text-3xl font-bold tracking-tight">Guides</h1>
      <p class="mt-2 max-w-2xl text-[var(--docs-fg-muted)]">Task-focused guides for extending Aidex.</p>

      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        @for (guide of guides; track guide.slug; let i = $index) {
          <a
            [routerLink]="['/guides', guide.slug]"
            docsReveal
            [docsRevealDelay]="i * 50"
            class="docs-hover-lift flex items-start gap-3 rounded-lg border border-[var(--docs-border)] p-4 hover:border-[var(--docs-brand)]"
          >
            <docs-animated-icon [kind]="guideIcon(guide.slug)" class="mt-0.5 h-6 w-6 shrink-0 text-[var(--docs-brand)]" />
            <div class="flex flex-col gap-1">
              <span class="font-medium">{{ guide.title }}</span>
              <span class="text-sm text-[var(--docs-fg-muted)]">{{ guide.description }}</span>
            </div>
          </a>
        }
      </div>
    </article>
  `,
})
export class GuidesPage {
  protected readonly guides = guides;

  constructor() {
    inject(PageContext).setTitle(null);
  }

  protected guideIcon(slug: string) {
    return guideIconKind(slug);
  }
}
