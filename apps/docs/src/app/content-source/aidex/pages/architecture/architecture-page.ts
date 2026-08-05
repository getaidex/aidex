import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DiagramViewer } from '../../../../engine/diagrams/diagram-viewer';
import type { DiagramData } from '../../../../engine/diagrams/diagram.types';
import { PageContext } from '../../../../engine/navigation/page-context.service';
import { ARCHITECTURE_SECTIONS } from '../../architecture.data';

import dependencyGraphData from '../../../../content/generated/dependency-graph.json';

const dependencyGraph = dependencyGraphData as DiagramData;

/** Interactive system explorer: every major layer, dispatch pattern, and the real, generated package dependency graph. */
@Component({
  selector: 'docs-architecture-page',
  standalone: true,
  imports: [DiagramViewer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="docs-page">
      <h1 class="text-3xl font-bold tracking-tight">Architecture</h1>
      <p class="mt-2 max-w-2xl text-[var(--docs-fg-muted)]">
        Click any node to highlight what it connects to, read what it does, and jump to the package, example, or
        guide that goes deeper.
      </p>

      <nav class="mt-6 flex flex-wrap gap-2" aria-label="Jump to section">
        @for (section of sections; track section.id) {
          <a
            [href]="'#' + section.id"
            class="rounded-full border border-[var(--docs-border)] px-3 py-1 text-xs text-[var(--docs-fg-muted)] hover:text-[var(--docs-fg)]"
            >{{ section.title }}</a
          >
        }
        <a
          href="#dependency-graph"
          class="rounded-full border border-[var(--docs-border)] px-3 py-1 text-xs text-[var(--docs-fg-muted)] hover:text-[var(--docs-fg)]"
          >Dependency graph</a
        >
      </nav>

      @for (section of sections; track section.id) {
        <section [id]="section.id" class="mt-12 scroll-mt-20">
          <h2 class="text-xl font-semibold">{{ section.title }}</h2>
          <p class="mt-1 max-w-2xl text-sm text-[var(--docs-fg-muted)]">{{ section.summary }}</p>
          <div class="mt-4">
            <docs-diagram-viewer [data]="section.diagram" />
          </div>
        </section>
      }

      <section id="dependency-graph" class="mt-12 scroll-mt-20">
        <h2 class="text-xl font-semibold">Package dependency graph</h2>
        <p class="mt-1 max-w-2xl text-sm text-[var(--docs-fg-muted)]">
          Generated from every package's real <code>dependencies</code> — not hand-drawn. Foundational packages
          (zero <code>&#64;aidex/*</code> runtime dependencies) sit at the bottom.
        </p>
        <div class="mt-4">
          <docs-diagram-viewer [data]="dependencyGraph" />
        </div>
      </section>
    </article>
  `,
})
export class ArchitecturePage {
  protected readonly sections = ARCHITECTURE_SECTIONS;
  protected readonly dependencyGraph = dependencyGraph;

  constructor() {
    inject(PageContext).setTitle(null);
  }
}
