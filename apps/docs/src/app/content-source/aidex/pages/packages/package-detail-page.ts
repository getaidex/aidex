import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BadgeList } from '../../../../engine/ui/badge-list';
import { InstallTabs } from '../../../../engine/ui/install-tabs';
import { MarkdownRenderer } from '../../../../engine/content/markdown-renderer';
import { PageContext } from '../../../../engine/navigation/page-context.service';
import type { Badge } from '../../../../engine/content/content.types';
import type { ExampleDoc, GuideDoc, PackageDoc } from '../../types';

import examplesData from '../../../../content/generated/examples.json';
import guidesData from '../../../../content/generated/guides.json';
import packagesData from '../../../../content/generated/packages.json';

const packages = packagesData as PackageDoc[];
const examples = examplesData as ExampleDoc[];
const guides = guidesData as GuideDoc[];
const packagesBySlug = new Map(packages.map((p) => [p.slug, p]));
const examplesBySlug = new Map(examples.map((e) => [e.slug, e]));
const guidesBySlug = new Map(guides.map((g) => [g.slug, g]));

@Component({
  selector: 'docs-package-detail-page',
  standalone: true,
  imports: [RouterLink, BadgeList, InstallTabs, MarkdownRenderer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pkg(); as p) {
      <article class="docs-page">
        <h1 class="text-3xl font-bold tracking-tight">{{ p.name }}</h1>
        <p class="mt-2 max-w-2xl text-[var(--docs-fg-muted)]">{{ p.description }}</p>

        <div class="mt-4">
          <docs-badge-list [badges]="badges()" />
        </div>

        <h2 class="mt-8 text-lg font-semibold">Installation</h2>
        <div class="mt-2 max-w-lg">
          <docs-install-tabs [packageName]="p.name" />
        </div>

        <div class="mt-6 grid gap-6 sm:grid-cols-2">
          @if (dependsOn().length) {
            <div>
              <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--docs-fg-muted)]">Depends on</h2>
              <ul class="mt-2 flex flex-col gap-1">
                @for (dep of dependsOn(); track dep.slug) {
                  <li>
                    <a [routerLink]="['/packages', dep.slug]" class="text-sm hover:text-[var(--docs-brand)]">{{
                      dep.name
                    }}</a>
                  </li>
                }
              </ul>
            </div>
          }
          @if (usedBy().length) {
            <div>
              <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--docs-fg-muted)]">Used by</h2>
              <ul class="mt-2 flex flex-col gap-1">
                @for (dep of usedBy(); track dep.slug) {
                  <li>
                    <a [routerLink]="['/packages', dep.slug]" class="text-sm hover:text-[var(--docs-brand)]">{{
                      dep.name
                    }}</a>
                  </li>
                }
              </ul>
            </div>
          }
        </div>

        @if (relatedExamples().length || relatedGuides().length) {
          <div class="mt-6 grid gap-6 sm:grid-cols-2">
            @if (relatedExamples().length) {
              <div>
                <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--docs-fg-muted)]">
                  Related examples
                </h2>
                <ul class="mt-2 flex flex-col gap-1">
                  @for (ex of relatedExamples(); track ex.slug) {
                    <li>
                      <a [routerLink]="['/examples', ex.slug]" class="text-sm hover:text-[var(--docs-brand)]">{{
                        ex.title
                      }}</a>
                    </li>
                  }
                </ul>
              </div>
            }
            @if (relatedGuides().length) {
              <div>
                <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--docs-fg-muted)]">
                  Related guides
                </h2>
                <ul class="mt-2 flex flex-col gap-1">
                  @for (guide of relatedGuides(); track guide.slug) {
                    <li>
                      <a [routerLink]="['/guides', guide.slug]" class="text-sm hover:text-[var(--docs-brand)]">{{
                        guide.title
                      }}</a>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        }

        <h2 class="mt-8 text-lg font-semibold">README</h2>
        <div class="mt-2">
          <docs-markdown-renderer [markdown]="p.readmeMarkdown" />
        </div>

        <a
          [href]="p.repositoryUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-8 inline-block text-sm font-medium text-[var(--docs-brand)]"
          >View source on GitHub ↗</a
        >
      </article>
    }
  `,
})
export class PackageDetailPage {
  readonly slug = input.required<string>();
  private readonly pageContext = inject(PageContext);

  protected readonly pkg = computed<PackageDoc | undefined>(() => packagesBySlug.get(this.slug()));

  protected readonly badges = computed<Badge[]>(() => {
    const p = this.pkg();
    if (!p) return [];
    const badges: Badge[] = [{ label: `v${p.version}`, tone: 'neutral' }];
    if (p.frozen) badges.push({ label: 'Frozen API', tone: 'positive', title: 'Public API, lifecycle, and type contracts are stable' });
    if (p.publishedToNpm) badges.push({ label: 'Published', tone: 'positive' });
    if (p.hasEsm) badges.push({ label: 'ESM', tone: 'neutral' });
    if (p.hasCjs) badges.push({ label: 'CJS', tone: 'neutral' });
    if (p.hasTypes) badges.push({ label: 'TypeScript', tone: 'info' });
    if (p.treeShakeable) badges.push({ label: 'Tree-shakeable', tone: 'neutral' });
    if (p.engineRange.node) badges.push({ label: `Node ${p.engineRange.node}`, tone: 'neutral' });
    return badges;
  });

  protected readonly dependsOn = computed<PackageDoc[]>(() =>
    (this.pkg()?.dependsOn ?? []).map((slug) => packagesBySlug.get(slug)).filter((p): p is PackageDoc => Boolean(p))
  );
  protected readonly usedBy = computed<PackageDoc[]>(() =>
    (this.pkg()?.usedBy ?? []).map((slug) => packagesBySlug.get(slug)).filter((p): p is PackageDoc => Boolean(p))
  );
  protected readonly relatedExamples = computed<ExampleDoc[]>(() =>
    (this.pkg()?.relatedExampleSlugs ?? [])
      .map((slug) => examplesBySlug.get(slug))
      .filter((e): e is ExampleDoc => Boolean(e))
  );
  protected readonly relatedGuides = computed<GuideDoc[]>(() =>
    (this.pkg()?.relatedGuideSlugs ?? [])
      .map((slug) => guidesBySlug.get(slug))
      .filter((g): g is GuideDoc => Boolean(g))
  );

  constructor() {
    effect(() => this.pageContext.setTitle(this.pkg()?.name ?? null));
  }
}
