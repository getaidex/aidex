import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

/** Small clipboard-copy button. Generic — takes the text to copy as an input. */
@Component({
  selector: 'docs-copy-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="rounded-md border border-[var(--docs-border)] px-2 py-1 text-xs text-[var(--docs-fg-muted)] transition-colors hover:text-[var(--docs-fg)]"
      (click)="copy()"
    >
      {{ copied() ? 'Copied' : label() }}
    </button>
  `,
})
export class CopyButton {
  readonly text = input.required<string>();
  readonly label = input('Copy');
  protected readonly copied = signal(false);

  protected copy(): void {
    void navigator.clipboard?.writeText(this.text()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
