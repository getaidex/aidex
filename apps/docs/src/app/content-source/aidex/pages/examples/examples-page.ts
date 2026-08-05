import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnimatedIcon } from '../../../../engine/motion/animated-icon';
import { RevealOnScroll } from '../../../../engine/motion/reveal-on-scroll.directive';
import { PageContext } from '../../../../engine/navigation/page-context.service';
import { levelIconKind } from '../../icon-mapping';
import type { ExampleDoc } from '../../types';

import examplesData from '../../../../content/generated/examples.json';

const examples = examplesData as ExampleDoc[];

interface Level {
  levelNumber: number;
  levelName: string;
  examples: ExampleDoc[];
}

const LEVELS: Level[] = Array.from(
  examples
    .reduce((map, example) => {
      const level = map.get(example.levelNumber) ?? {
        levelNumber: example.levelNumber,
        levelName: example.levelName,
        examples: [],
      };
      level.examples.push(example);
      map.set(example.levelNumber, level);
      return map;
    }, new Map<number, Level>())
    .values()
).sort((a, b) => a.levelNumber - b.levelNumber);

const DIFFICULTY_TONE: Record<string, string> = {
  Beginner: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Intermediate: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Advanced: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

/** The learning-path view: examples grouped into levels, presented as a guided course, not a file browser. */
@Component({
  selector: 'docs-examples-page',
  standalone: true,
  imports: [RouterLink, AnimatedIcon, RevealOnScroll],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="docs-page">
      <h1 class="text-3xl font-bold tracking-tight">Examples</h1>
      <p class="mt-2 max-w-2xl text-[var(--docs-fg-muted)]">
        A hands-on course, not a reference dump. {{ examples.length }} small, real, runnable programs — work
        through them in order, each level assumes everything taught above it.
      </p>

      <div class="mt-10 flex flex-col">
        @for (level of levels; track level.levelNumber) {
          <div docsReveal>
            <div class="flex items-center gap-3">
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--docs-brand-contrast)]"
                style="background-color: var(--docs-brand)"
              >
                <docs-animated-icon [kind]="levelIcon(level.levelName)" class="h-5 w-5" />
              </span>
              <h2 class="text-lg font-semibold">{{ level.levelName }}</h2>
            </div>

            <div class="mt-3 grid gap-3 pl-11 sm:grid-cols-2">
              @for (example of level.examples; track example.slug; let i = $index) {
                <a
                  [routerLink]="['/examples', example.slug]"
                  docsReveal
                  [docsRevealDelay]="i * 60"
                  class="docs-hover-lift flex flex-col gap-2 rounded-lg border border-[var(--docs-border)] p-4 hover:border-[var(--docs-brand)]"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-medium">{{ example.title }}</span>
                    <span
                      class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                      [class]="difficultyTone(example.difficulty)"
                      >{{ example.difficulty }}</span
                    >
                  </div>
                  <p class="line-clamp-2 text-sm text-[var(--docs-fg-muted)]">{{ example.whatProblem }}</p>
                  <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--docs-fg-muted)]">
                    <span>⏱ {{ example.estimatedTime }}</span>
                    @if (example.conceptsLearned.length) {
                      <span>{{ example.conceptsLearned.length }} concept{{ example.conceptsLearned.length > 1 ? 's' : '' }}</span>
                    }
                  </div>
                </a>
              }
            </div>
          </div>
          @if (!$last) {
            <div class="ml-4 my-2 h-6 w-px bg-[var(--docs-border)]" aria-hidden="true"></div>
          }
        }
      </div>
    </article>
  `,
})
export class ExamplesPage {
  protected readonly examples = examples;
  protected readonly levels = LEVELS;

  constructor() {
    inject(PageContext).setTitle(null);
  }

  protected difficultyTone(difficulty: string): string {
    return DIFFICULTY_TONE[difficulty] ?? 'bg-[var(--docs-bg-subtle)] text-[var(--docs-fg-muted)]';
  }

  protected levelIcon(levelName: string) {
    return levelIconKind(levelName);
  }
}
