import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BadgeList } from '../../../../engine/ui/badge-list';
import { CopyButton } from '../../../../engine/ui/copy-button';
import { MarkdownRenderer } from '../../../../engine/content/markdown-renderer';
import { PageContext } from '../../../../engine/navigation/page-context.service';
import { PageNav } from '../../../../engine/navigation/page-nav';
import type { Badge } from '../../../../engine/content/content.types';
import type { ExampleDoc, PackageDoc } from '../../types';

import examplesData from '../../../../content/generated/examples.json';
import packagesData from '../../../../content/generated/packages.json';

const examples = examplesData as ExampleDoc[];
const packages = packagesData as PackageDoc[];
const examplesBySlug = new Map(examples.map((e) => [e.slug, e]));
const packagesBySlug = new Map(packages.map((p) => [p.slug, p]));

@Component({
  selector: 'docs-example-detail-page',
  standalone: true,
  imports: [RouterLink, MarkdownRenderer, BadgeList, CopyButton, PageNav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (example(); as ex) {
      <article class="docs-page">
        <h1 class="text-3xl font-bold tracking-tight">{{ ex.title }}</h1>
        <div class="mt-3">
          <docs-badge-list [badges]="badges()" />
        </div>

        <div class="mt-6">
          <docs-markdown-renderer [markdown]="ex.whatProblem" />
        </div>

        <h2 class="mt-8 text-lg font-semibold">Why would I use this?</h2>
        <div class="mt-2">
          <docs-markdown-renderer [markdown]="ex.whyUse" />
        </div>

        <h2 class="mt-8 text-lg font-semibold">When should I use this?</h2>
        <div class="mt-2">
          <docs-markdown-renderer [markdown]="ex.whenToUse" />
        </div>

        @if (ex.requirements) {
          <h2 class="mt-8 text-lg font-semibold">Requirements</h2>
          <div class="mt-2">
            <docs-markdown-renderer [markdown]="ex.requirements" />
          </div>
        }

        @if (ex.runCommand) {
          <h2 class="mt-8 text-lg font-semibold">Run it</h2>
          <div class="relative mt-2 overflow-hidden rounded-lg border border-[var(--docs-border)] bg-[var(--docs-bg-subtle)]">
            <div class="absolute right-2 top-2">
              <docs-copy-button [text]="ex.runCommand" />
            </div>
            <pre class="overflow-x-auto p-4 text-sm"><code>{{ ex.runCommand }}</code></pre>
          </div>
        }

        @if (ex.expectedOutput) {
          <h2 class="mt-8 text-lg font-semibold">Expected output</h2>
          <div class="mt-2">
            <docs-markdown-renderer [markdown]="ex.expectedOutput" />
          </div>
        }

        @if (ex.conceptsLearned.length) {
          <h2 class="mt-8 text-lg font-semibold">Concepts learned</h2>
          <ul class="mt-2 flex flex-col gap-1 text-sm text-[var(--docs-fg-muted)]">
            @for (concept of ex.conceptsLearned; track concept) {
              <li>· {{ concept }}</li>
            }
          </ul>
        }

        @if (relatedPackages().length) {
          <h2 class="mt-8 text-lg font-semibold">Related packages</h2>
          <div class="mt-2 flex flex-wrap gap-2">
            @for (pkg of relatedPackages(); track pkg.slug) {
              <a
                [routerLink]="['/packages', pkg.slug]"
                class="rounded-md border border-[var(--docs-border)] px-2.5 py-1 text-sm hover:border-[var(--docs-brand)]"
                >{{ pkg.name }}</a
              >
            }
          </div>
        }

        <a
          [href]="'https://github.com/getaidex/aidex/tree/main/' + ex.sourcePath"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-8 inline-block text-sm font-medium text-[var(--docs-brand)]"
          >View source on GitHub ↗</a
        >

        <docs-page-nav [prev]="prevLink()" [next]="nextLink()" />
      </article>
    }
  `,
})
export class ExampleDetailPage {
  readonly slug = input.required<string>();
  private readonly pageContext = inject(PageContext);

  protected readonly example = computed<ExampleDoc | undefined>(() => examplesBySlug.get(this.slug()));

  protected readonly badges = computed<Badge[]>(() => {
    const ex = this.example();
    if (!ex) return [];
    return [
      { label: `Level ${ex.levelNumber} · ${ex.levelName}`, tone: 'neutral' },
      { label: ex.difficulty, tone: 'info' },
      { label: ex.estimatedTime, tone: 'neutral' },
    ];
  });

  protected readonly relatedPackages = computed<PackageDoc[]>(() => {
    const ex = this.example();
    if (!ex) return [];
    return ex.relatedPackages.map((slug) => packagesBySlug.get(slug)).filter((p): p is PackageDoc => Boolean(p));
  });

  protected readonly prevLink = computed(() => {
    const ex = this.example();
    if (!ex?.prevSlug) return null;
    const prev = examplesBySlug.get(ex.prevSlug);
    return prev ? { label: prev.title, path: `/examples/${prev.slug}` } : null;
  });

  protected readonly nextLink = computed(() => {
    const ex = this.example();
    if (!ex?.nextSlug) return null;
    const next = examplesBySlug.get(ex.nextSlug);
    return next ? { label: next.title, path: `/examples/${next.slug}` } : null;
  });

  constructor() {
    effect(() => this.pageContext.setTitle(this.example()?.title ?? null));
  }
}
