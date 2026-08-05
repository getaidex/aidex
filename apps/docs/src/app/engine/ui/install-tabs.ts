import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CopyButton } from './copy-button';

interface Registry {
  id: 'pnpm' | 'npm' | 'yarn' | 'bun';
  label: string;
  command: (packages: string[]) => string;
}

const REGISTRIES: Registry[] = [
  { id: 'pnpm', label: 'pnpm', command: (pkgs) => `pnpm add ${pkgs.join(' ')}` },
  { id: 'npm', label: 'npm', command: (pkgs) => `npm install ${pkgs.join(' ')}` },
  { id: 'yarn', label: 'yarn', command: (pkgs) => `yarn add ${pkgs.join(' ')}` },
  { id: 'bun', label: 'bun', command: (pkgs) => `bun add ${pkgs.join(' ')}` },
];

/**
 * Package-manager install command tabs with copy-to-clipboard. Generic over
 * any package name(s) — no registry/branding assumptions baked in.
 */
@Component({
  selector: 'docs-install-tabs',
  standalone: true,
  imports: [CopyButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-hidden rounded-lg border border-[var(--docs-border)]">
      <div class="flex items-center justify-between border-b border-[var(--docs-border)] bg-[var(--docs-bg-subtle)] px-2">
        <div class="flex gap-1" role="tablist">
          @for (registry of registries; track registry.id) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="registry.id === active()"
              class="rounded-t-md px-3 py-2 text-sm transition-colors"
              [class]="
                registry.id === active()
                  ? 'text-[var(--docs-brand)] font-medium'
                  : 'text-[var(--docs-fg-muted)]'
              "
              (click)="active.set(registry.id)"
            >
              {{ registry.label }}
            </button>
          }
        </div>
        <docs-copy-button [text]="activeCommand()" />
      </div>
      <pre class="overflow-x-auto px-4 py-3 text-sm"><code>{{ activeCommand() }}</code></pre>
    </div>
  `,
})
export class InstallTabs {
  readonly packageName = input.required<string>();
  readonly extraPackages = input<string[]>([]);

  protected readonly registries = REGISTRIES;
  protected readonly active = signal<Registry['id']>('pnpm');

  protected readonly activeCommand = computed(() => {
    const registry = REGISTRIES.find((r) => r.id === this.active())!;
    return registry.command([this.packageName(), ...this.extraPackages()]);
  });
}
