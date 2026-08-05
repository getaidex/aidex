import { ChangeDetectionStrategy, Component, inject, input, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';

function escapeHtml(value: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (ch) => map[ch]);
}

function highlightCode(code: string, lang: string): string {
  const grammar = lang && Prism.languages[lang] ? Prism.languages[lang] : undefined;
  return grammar ? Prism.highlight(code, grammar, lang) : escapeHtml(code);
}

const renderer = new marked.Renderer();
renderer.code = ({ text, lang }) => {
  const language = (lang ?? 'text').split(' ')[0];
  const highlighted = highlightCode(text, language);
  const encoded = encodeURIComponent(text);
  return (
    `<div class="docs-code-block relative my-4 overflow-hidden rounded-lg border border-[var(--docs-border)] bg-[var(--docs-bg-subtle)]">` +
    `<button type="button" class="docs-copy-btn absolute right-2 top-2 rounded-md border border-[var(--docs-border)] bg-[var(--docs-bg)] px-2 py-1 text-xs text-[var(--docs-fg-muted)] hover:text-[var(--docs-fg)]" data-copy-text="${encoded}">Copy</button>` +
    `<pre class="language-${language} overflow-x-auto p-4 text-sm leading-6"><code class="language-${language}">${highlighted}</code></pre>` +
    `</div>`
  );
};

marked.use({ renderer, gfm: true });

/**
 * Renders a markdown string as sanitized, syntax-highlighted HTML with
 * copyable code blocks. Knows nothing about where the markdown came from.
 */
@Component({
  selector: 'docs-markdown-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(click)': 'onClick($event)' },
  template: `<div
    class="docs-prose prose prose-zinc max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-a:text-[var(--docs-brand)]"
    [innerHTML]="renderedHtml()"
  ></div>`,
})
export class MarkdownRenderer {
  readonly markdown = input.required<string>();
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly renderedHtml = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(marked.parse(this.markdown(), { async: false }) as string)
  );

  protected onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLElement>('[data-copy-text]');
    if (!button) return;
    const text = decodeURIComponent(button.dataset['copyText'] ?? '');
    void navigator.clipboard?.writeText(text).then(() => {
      const original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => {
        button.textContent = original;
      }, 1500);
    });
  }
}
