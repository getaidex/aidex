import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MarkdownRenderer } from '../../../../engine/content/markdown-renderer';
import { InstallTabs } from '../../../../engine/ui/install-tabs';
import { PageNav } from '../../../../engine/navigation/page-nav';
import { PageContext } from '../../../../engine/navigation/page-context.service';
import type { GettingStartedDoc } from '../../types';

import gettingStartedData from '../../../../content/generated/getting-started.json';

const gettingStarted = gettingStartedData as GettingStartedDoc;

@Component({
  selector: 'docs-getting-started-page',
  standalone: true,
  imports: [MarkdownRenderer, InstallTabs, PageNav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="docs-page">
      <h1 class="text-3xl font-bold tracking-tight">Getting Started</h1>
      <p class="mt-2 max-w-2xl text-[var(--docs-fg-muted)]">
        Install Aidex and build your first AI app in under two minutes.
      </p>

      <h2 class="mt-10 text-xl font-semibold">Requirements</h2>
      <ul class="mt-3 flex flex-col gap-1 text-sm text-[var(--docs-fg-muted)]">
        <li>Node {{ gettingStarted.requirements.node }}</li>
        <li>pnpm {{ gettingStarted.requirements.pnpm }} (or npm/yarn/bun)</li>
        <li>Optional: a <code>GEMINI_API_KEY</code> — every example falls back to a deterministic demo provider without one</li>
      </ul>

      <h2 class="mt-10 text-xl font-semibold">Installation</h2>
      <p class="mt-2 text-sm text-[var(--docs-fg-muted)]">
        Most applications start with the SDK plus a provider.
      </p>
      <div class="mt-4 max-w-lg">
        <docs-install-tabs packageName="@aidex/sdk" [extraPackages]="['@aidex/providers']" />
      </div>
      <p class="mt-2 text-xs text-[var(--docs-fg-muted)]">
        Every <code>&#64;aidex/*</code> package ships ESM and CommonJS builds with matching TypeScript
        declarations — see below.
      </p>

      <h2 class="mt-10 text-xl font-semibold">ESM and CommonJS</h2>
      <div class="mt-4">
        <docs-markdown-renderer [markdown]="gettingStarted.quickStartMarkdown" />
      </div>

      <h2 class="mt-10 text-xl font-semibold">Build your first AI app</h2>
      <div class="mt-4">
        <docs-markdown-renderer [markdown]="gettingStarted.firstAppMarkdown" />
      </div>

      <docs-page-nav [next]="{ label: 'Examples — the full learning path', path: '/examples' }" />
    </article>
  `,
})
export class GettingStartedPage {
  protected readonly gettingStarted = gettingStarted;

  constructor() {
    inject(PageContext).setTitle(null);
  }
}
