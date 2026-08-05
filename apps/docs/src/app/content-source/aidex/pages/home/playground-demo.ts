import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface PlaygroundStep {
  id: string;
  label: string;
  detail: string;
  snippet: string;
}

const STEPS: PlaygroundStep[] = [
  {
    id: 'prompt',
    label: 'Prompt',
    detail: 'Your application sends a plain-language request.',
    snippet: '"Summarize this document in 3 bullet points."',
  },
  {
    id: 'template',
    label: 'Prompt Template',
    detail: 'A PromptRegistry renders a versioned template with your variables substituted in.',
    snippet: 'summarize.v1: "Summarize the following in {{count}} bullet points:\\n{{input}}"',
  },
  {
    id: 'workflow',
    label: 'Workflow',
    detail: 'A Workflow sequences steps — fetch, template, call, format — against one shared context.',
    snippet: 'new Workflow("summarize").addStep(templateStep).addStep(callStep)',
  },
  {
    id: 'engine',
    label: 'Engine',
    detail: 'An Engine is dispatched by id from an EngineRegistry — a provider-agnostic unit of work.',
    snippet: 'engineRegistry.execute("document.summarize", context)',
  },
  {
    id: 'provider',
    label: 'Provider',
    detail: 'The Provider turns the rendered prompt into a real model call.',
    snippet: 'GeminiProvider.generate(prompt)',
  },
  {
    id: 'response',
    label: 'Response',
    detail: 'The result flows back through the same chain to your application.',
    snippet: '"• Point one\\n• Point two\\n• Point three"',
  },
];

/**
 * A click-through illustration of one request flowing through Aidex's
 * layers. Static, hand-authored demo data — no live API call is made.
 */
@Component({
  selector: 'docs-playground-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-[var(--docs-border)] bg-[var(--docs-bg-subtle)] p-4 sm:p-6">
      <div class="flex flex-wrap items-center gap-2" role="tablist" aria-label="Request flow steps">
        @for (step of steps; track step.id; let index = $index) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="index === active()"
            class="rounded-full border px-3 py-1.5 text-sm transition-colors"
            [class]="
              index === active()
                ? 'border-[var(--docs-brand)] bg-[var(--docs-brand)] text-[var(--docs-brand-contrast)]'
                : 'border-[var(--docs-border)] bg-[var(--docs-bg)] text-[var(--docs-fg-muted)] hover:text-[var(--docs-fg)]'
            "
            (click)="active.set(index)"
          >
            {{ step.label }}
          </button>
          @if (!$last) {
            <span class="text-[var(--docs-fg-muted)]" aria-hidden="true">→</span>
          }
        }
      </div>

      <div class="mt-4 rounded-lg border border-[var(--docs-border)] bg-[var(--docs-bg)] p-4">
        <p class="text-sm text-[var(--docs-fg-muted)]">{{ steps[active()].detail }}</p>
        <pre
          class="mt-3 overflow-x-auto rounded-md bg-[var(--docs-bg-subtle)] p-3 text-xs leading-5"
        ><code>{{ steps[active()].snippet }}</code></pre>
      </div>

      <p class="mt-3 text-xs text-[var(--docs-fg-muted)]">
        Illustrative walkthrough — no live API call is made on this page.
      </p>
    </div>
  `,
})
export class PlaygroundDemo {
  protected readonly steps = STEPS;
  protected readonly active = signal(0);
}
