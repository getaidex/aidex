import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarkdownRenderer } from '../../../../engine/content/markdown-renderer';
import { PageContext } from '../../../../engine/navigation/page-context.service';
import { ARCHITECTURE_SECTIONS } from '../../architecture.data';
import type { ExampleDoc, GuideDoc, PackageDoc } from '../../types';

import examplesData from '../../../../content/generated/examples.json';
import guidesData from '../../../../content/generated/guides.json';
import packagesData from '../../../../content/generated/packages.json';

const guides = guidesData as GuideDoc[];
const packages = packagesData as PackageDoc[];
const examples = examplesData as ExampleDoc[];
const guidesBySlug = new Map(guides.map((g) => [g.slug, g]));
const packagesBySlug = new Map(packages.map((p) => [p.slug, p]));
const examplesBySlug = new Map(examples.map((e) => [e.slug, e]));

function architectureSectionsFor(guideSlug: string) {
  return ARCHITECTURE_SECTIONS.filter((section) =>
    section.diagram.layers.some((layer) =>
      layer.nodes.some((node) => node.relatedGuide?.path === `/guides/${guideSlug}`)
    )
  );
}

@Component({
  selector: 'docs-guide-detail-page',
  standalone: true,
  imports: [RouterLink, MarkdownRenderer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (guide(); as guide) {
      <article class="docs-page">
        <h1 class="text-3xl font-bold tracking-tight">{{ guide.title }}</h1>
        <p class="mt-2 max-w-2xl text-[var(--docs-fg-muted)]">{{ guide.description }}</p>

        <div class="mt-6">
          <docs-markdown-renderer [markdown]="guide.markdown" />
        </div>

        <div class="mt-10 rounded-lg border border-[var(--docs-border)] bg-[var(--docs-bg-subtle)] p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--docs-fg-muted)]">Next steps</h2>
          <ul class="mt-3 flex flex-col gap-2 text-sm">
            @for (ex of relatedExamples(); track ex.slug) {
              <li>
                <a [routerLink]="['/examples', ex.slug]" class="text-[var(--docs-brand)]"
                  >→ Related example: {{ ex.title }}</a
                >
              </li>
            }
            @for (pkg of relatedPackages(); track pkg.slug) {
              <li>
                <a [routerLink]="['/packages', pkg.slug]" class="text-[var(--docs-brand)]"
                  >→ Related package: {{ pkg.name }}</a
                >
              </li>
            }
            @for (section of relatedArchitecture(); track section.id) {
              <li>
                <a [routerLink]="['/architecture']" [fragment]="section.id" class="text-[var(--docs-brand)]"
                  >→ Related architecture: {{ section.title }}</a
                >
              </li>
            }
          </ul>
        </div>

        <a
          [href]="'https://github.com/getaidex/aidex/blob/main/' + guide.sourcePath"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-6 inline-block text-sm font-medium text-[var(--docs-brand)]"
          >View source on GitHub ↗</a
        >
      </article>
    }
  `,
})
export class GuideDetailPage {
  readonly slug = input.required<string>();
  private readonly pageContext = inject(PageContext);

  protected readonly guide = computed<GuideDoc | undefined>(() => guidesBySlug.get(this.slug()));

  protected readonly relatedPackages = computed<PackageDoc[]>(() =>
    (this.guide()?.relatedPackages ?? []).map((slug) => packagesBySlug.get(slug)).filter((p): p is PackageDoc => Boolean(p))
  );
  protected readonly relatedExamples = computed<ExampleDoc[]>(() =>
    (this.guide()?.relatedExamples ?? [])
      .map((slug) => examplesBySlug.get(slug))
      .filter((e): e is ExampleDoc => Boolean(e))
  );
  protected readonly relatedArchitecture = computed(() => {
    const guide = this.guide();
    return guide ? architectureSectionsFor(guide.slug) : [];
  });

  constructor() {
    effect(() => this.pageContext.setTitle(this.guide()?.title ?? null));
  }
}
