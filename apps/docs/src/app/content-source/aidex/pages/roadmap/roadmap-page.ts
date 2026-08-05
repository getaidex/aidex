import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MarkdownRenderer } from '../../../../engine/content/markdown-renderer';
import { PageContext } from '../../../../engine/navigation/page-context.service';
import type { RoadmapDoc } from '../../types';

import roadmapData from '../../../../content/generated/roadmap.json';

const roadmap = roadmapData as RoadmapDoc;

@Component({
  selector: 'docs-roadmap-page',
  standalone: true,
  imports: [MarkdownRenderer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="docs-page">
      <h1 class="text-3xl font-bold tracking-tight">{{ roadmap.title }}</h1>
      <div class="mt-6">
        <docs-markdown-renderer [markdown]="roadmap.markdown" />
      </div>
    </article>
  `,
})
export class RoadmapPage {
  protected readonly roadmap = roadmap;

  constructor() {
    inject(PageContext).setTitle(null);
  }
}
