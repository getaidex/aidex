import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService, type ThemePreference } from './theme.service';

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];
const LABELS: Record<ThemePreference, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const ICONS: Record<ThemePreference, string> = { system: '🖥️', light: '☀️', dark: '🌙' };

/** Cycles light / dark / system theme preference. Generic UI, no product branding. */
@Component({
  selector: 'docs-theme-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="flex items-center gap-1.5 rounded-md border border-[var(--docs-border)] px-2.5 py-1.5 text-sm text-[var(--docs-fg-muted)] hover:text-[var(--docs-fg)]"
      [attr.aria-label]="'Theme: ' + label() + '. Click to change.'"
      (click)="cycle()"
    >
      <span aria-hidden="true">{{ icon() }}</span>
      <span class="hidden sm:inline">{{ label() }}</span>
    </button>
  `,
})
export class ThemeToggle {
  private readonly theme = inject(ThemeService);

  protected readonly label = () => LABELS[this.theme.preference()];
  protected readonly icon = () => ICONS[this.theme.preference()];

  protected cycle(): void {
    const current = ORDER.indexOf(this.theme.preference());
    this.theme.setPreference(ORDER[(current + 1) % ORDER.length]);
  }
}
