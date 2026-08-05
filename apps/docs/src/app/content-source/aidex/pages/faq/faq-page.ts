import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MarkdownRenderer } from '../../../../engine/content/markdown-renderer';
import { PageContext } from '../../../../engine/navigation/page-context.service';
import type { FaqDoc } from '../../types';

import faqData from '../../../../content/generated/faq.json';

const faq = faqData as FaqDoc;

@Component({
  selector: 'docs-faq-page',
  standalone: true,
  imports: [MarkdownRenderer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="docs-page">
      <h1 class="text-3xl font-bold tracking-tight">{{ faq.title }}</h1>
      <div class="mt-6 flex flex-col gap-8">
        @for (entry of faq.entries; track entry.question) {
          <div>
            <h2 class="text-lg font-semibold">{{ entry.question }}</h2>
            <div class="mt-2">
              <docs-markdown-renderer [markdown]="entry.answer" />
            </div>
          </div>
        }
      </div>
    </article>
  `,
})
export class FaqPage {
  protected readonly faq = faq;

  constructor() {
    inject(PageContext).setTitle(null);
  }
}
