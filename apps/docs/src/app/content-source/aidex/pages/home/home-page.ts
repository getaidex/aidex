import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiagramViewer } from '../../../../engine/diagrams/diagram-viewer';
import { MarkdownRenderer } from '../../../../engine/content/markdown-renderer';
import { InstallTabs } from '../../../../engine/ui/install-tabs';
import { PageContext } from '../../../../engine/navigation/page-context.service';
import { ARCHITECTURE_SECTIONS } from '../../architecture.data';
import { aidexSiteConfig } from '../../docs.config';
import type { ExampleDoc, HomeDoc, PackageDoc } from '../../types';
import { PlaygroundDemo } from './playground-demo';

import examplesData from '../../../../content/generated/examples.json';
import homeData from '../../../../content/generated/home.json';
import packagesData from '../../../../content/generated/packages.json';

const home = homeData as HomeDoc;
const packages = packagesData as PackageDoc[];
const examples = examplesData as ExampleDoc[];

interface LevelSummary {
  levelNumber: number;
  levelName: string;
  count: number;
}

const LEVELS: LevelSummary[] = Array.from(
  examples
    .reduce((map, example) => {
      const existing = map.get(example.levelNumber);
      if (existing) existing.count += 1;
      else map.set(example.levelNumber, { levelNumber: example.levelNumber, levelName: example.levelName, count: 1 });
      return map;
    }, new Map<number, LevelSummary>())
    .values()
).sort((a, b) => a.levelNumber - b.levelNumber);

const CATEGORY_COUNTS = Array.from(
  packages
    .reduce((map, pkg) => {
      map.set(pkg.category, (map.get(pkg.category) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
    .entries()
).map(([category, count]) => ({ category, count }));

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, MarkdownRenderer, DiagramViewer, InstallTabs, PlaygroundDemo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-col items-start gap-6 py-8 sm:py-14">
      <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
        Build AI applications with <span style="color: var(--docs-brand)">composable engines</span>.
      </h1>
      <p class="max-w-2xl text-lg text-[var(--docs-fg-muted)]">{{ config.tagline }}</p>

      <div class="flex flex-wrap items-center gap-3">
        <a
          routerLink="/getting-started"
          class="rounded-md px-4 py-2 text-sm font-medium text-[var(--docs-brand-contrast)]"
          style="background-color: var(--docs-brand)"
          >Get Started</a
        >
        <a
          routerLink="/examples"
          class="rounded-md border border-[var(--docs-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--docs-bg-subtle)]"
          >Examples</a
        >
        <a
          [href]="config.githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-md border border-[var(--docs-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--docs-bg-subtle)]"
          >GitHub ↗</a
        >
      </div>

      <pre
        class="rounded-md border border-[var(--docs-border)] bg-[var(--docs-bg-subtle)] px-4 py-2 text-sm"
      ><code>{{ config.installCommand }}</code></pre>
    </section>

    <section class="border-t border-[var(--docs-border)] py-10">
      <h2 class="text-xl font-semibold">Quick install</h2>
      <p class="mt-1 max-w-2xl text-sm text-[var(--docs-fg-muted)]">
        Most applications start with the SDK plus a provider.
      </p>
      <div class="mt-4 max-w-lg">
        <docs-install-tabs packageName="@aidex/sdk" [extraPackages]="['@aidex/providers']" />
      </div>
    </section>

    <section class="border-t border-[var(--docs-border)] py-10">
      <h2 class="text-xl font-semibold">Why Aidex?</h2>
      <div class="mt-4 max-w-3xl">
        <docs-markdown-renderer [markdown]="home.introMarkdown" />
      </div>
    </section>

    <section class="border-t border-[var(--docs-border)] py-10">
      <div class="flex items-baseline justify-between gap-4">
        <h2 class="text-xl font-semibold">Interactive architecture</h2>
        <a routerLink="/architecture" class="text-sm font-medium text-[var(--docs-brand)]">Explore the full system →</a>
      </div>
      <p class="mt-1 max-w-2xl text-sm text-[var(--docs-fg-muted)]">
        Click a node to see what it does, what depends on it, and where to learn more.
      </p>
      <div class="mt-4">
        <docs-diagram-viewer [data]="kernelDiagram" />
      </div>
    </section>

    <section class="border-t border-[var(--docs-border)] py-10">
      <h2 class="text-xl font-semibold">See it flow, step by step</h2>
      <p class="mt-1 max-w-2xl text-sm text-[var(--docs-fg-muted)]">
        How one request moves from a prompt to a response.
      </p>
      <div class="mt-4">
        <docs-playground-demo />
      </div>
    </section>

    <section class="border-t border-[var(--docs-border)] py-10">
      <div class="flex items-baseline justify-between gap-4">
        <h2 class="text-xl font-semibold">Feature packages</h2>
        <a routerLink="/packages" class="text-sm font-medium text-[var(--docs-brand)]">See all packages →</a>
      </div>
      <p class="mt-1 max-w-2xl text-sm text-[var(--docs-fg-muted)]">
        Higher-level capabilities composed from Strategies, Prompts, Tools, and a Provider.
      </p>
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        @for (pkg of featurePackages; track pkg.slug) {
          <a
            [routerLink]="['/packages', pkg.slug]"
            class="rounded-lg border border-[var(--docs-border)] p-3 text-sm hover:border-[var(--docs-brand)]"
          >
            <div class="font-medium">{{ pkg.name }}</div>
            <div class="mt-1 line-clamp-2 text-xs text-[var(--docs-fg-muted)]">{{ pkg.description }}</div>
          </a>
        }
      </div>
    </section>

    <section class="border-t border-[var(--docs-border)] py-10">
      <div class="flex items-baseline justify-between gap-4">
        <h2 class="text-xl font-semibold">Learning path</h2>
        <a routerLink="/examples" class="text-sm font-medium text-[var(--docs-brand)]">Start learning →</a>
      </div>
      <p class="mt-1 max-w-2xl text-sm text-[var(--docs-fg-muted)]">
        {{ examples.length }} runnable examples across {{ levels.length }} levels, from getting started to a
        capstone assistant.
      </p>
      <ol class="mt-4 flex flex-col gap-1.5">
        @for (level of levels; track level.levelNumber) {
          <li class="flex items-center gap-3 text-sm">
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--docs-border)] text-xs text-[var(--docs-fg-muted)]"
              >{{ level.levelNumber }}</span
            >
            <span class="font-medium">{{ level.levelName }}</span>
            <span class="text-[var(--docs-fg-muted)]">· {{ level.count }} example{{ level.count > 1 ? 's' : '' }}</span>
          </li>
        }
      </ol>
    </section>

    <section class="border-t border-[var(--docs-border)] py-10">
      <div class="flex items-baseline justify-between gap-4">
        <h2 class="text-xl font-semibold">Real examples</h2>
        <a routerLink="/examples" class="text-sm font-medium text-[var(--docs-brand)]">Browse all {{ examples.length }} →</a>
      </div>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        @for (example of featuredExamples; track example.slug) {
          <a
            [routerLink]="['/examples', example.slug]"
            class="rounded-lg border border-[var(--docs-border)] p-4 text-sm hover:border-[var(--docs-brand)]"
          >
            <div class="font-medium">{{ example.title }}</div>
            <div class="mt-1 text-xs text-[var(--docs-fg-muted)]">
              {{ example.difficulty }} · {{ example.estimatedTime }}
            </div>
          </a>
        }
      </div>
    </section>

    <section class="border-t border-[var(--docs-border)] py-10">
      <div class="flex items-baseline justify-between gap-4">
        <h2 class="text-xl font-semibold">Packages</h2>
        <a routerLink="/packages" class="text-sm font-medium text-[var(--docs-brand)]">Open the explorer →</a>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        @for (entry of categoryCounts; track entry.category) {
          <div class="rounded-lg border border-[var(--docs-border)] p-3 text-center">
            <div class="text-2xl font-semibold">{{ entry.count }}</div>
            <div class="mt-1 text-xs text-[var(--docs-fg-muted)]">{{ entry.category }}</div>
          </div>
        }
      </div>
    </section>

    <section class="border-t border-[var(--docs-border)] py-10">
      <h2 class="text-xl font-semibold">Roadmap</h2>
      <p class="mt-2 max-w-2xl text-sm text-[var(--docs-fg-muted)]">{{ home.roadmapTeaser }}</p>
      <a routerLink="/roadmap" class="mt-3 inline-block text-sm font-medium text-[var(--docs-brand)]"
        >Read the roadmap →</a
      >
    </section>

    <section class="border-t border-[var(--docs-border)] py-10">
      <div class="rounded-xl border border-[var(--docs-border)] bg-[var(--docs-bg-subtle)] p-6 text-center sm:p-10">
        <h2 class="text-xl font-semibold">Open source, MIT-licensed</h2>
        <p class="mx-auto mt-2 max-w-md text-sm text-[var(--docs-fg-muted)]">
          Read the source, file an issue, or open a pull request.
        </p>
        <a
          [href]="config.githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium text-[var(--docs-brand-contrast)]"
          style="background-color: var(--docs-brand)"
          >View on GitHub ↗</a
        >
      </div>
    </section>
  `,
})
export class HomePage {
  protected readonly config = aidexSiteConfig;
  protected readonly home = home;
  protected readonly examples = examples;
  protected readonly levels = LEVELS;
  protected readonly categoryCounts = CATEGORY_COUNTS;
  protected readonly featuredExamples = examples.slice(0, 4);
  protected readonly featurePackages = packages.filter((pkg) => pkg.category === 'Feature Packs');
  protected readonly kernelDiagram = ARCHITECTURE_SECTIONS.find((section) => section.id === 'kernel')!.diagram;

  constructor() {
    inject(PageContext).setTitle(null);
  }
}
