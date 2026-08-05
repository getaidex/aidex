import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchEngine } from './search-engine.service';
import { SearchUiState } from './search-ui-state.service';

/** Cmd/Ctrl+K search modal. Generic — results come from whatever SearchEngine has indexed. */
@Component({
  selector: 'docs-search-modal',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]"
        (click)="ui.close()"
      >
        <div
          class="w-full max-w-lg overflow-hidden rounded-lg border border-[var(--docs-border)] bg-[var(--docs-bg)] shadow-xl"
          (click)="$event.stopPropagation()"
        >
          <input
            type="text"
            autofocus
            placeholder="Search packages, examples, guides..."
            class="w-full border-b border-[var(--docs-border)] bg-transparent px-4 py-3 text-sm outline-none"
            [value]="query()"
            (input)="query.set(inputValue($event))"
          />
          <ul class="max-h-80 overflow-y-auto p-2">
            @for (result of results(); track result.id) {
              <li>
                <a
                  [routerLink]="result.path"
                  (click)="selectResult()"
                  class="block rounded-md px-3 py-2 hover:bg-[var(--docs-bg-subtle)]"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-medium">{{ result.title }}</span>
                    <span class="shrink-0 text-xs text-[var(--docs-fg-muted)]">{{ result.section }}</span>
                  </div>
                  <p class="mt-0.5 truncate text-xs text-[var(--docs-fg-muted)]">{{ result.excerpt }}</p>
                </a>
              </li>
            }
            @if (query() && results().length === 0) {
              <li class="px-3 py-6 text-center text-sm text-[var(--docs-fg-muted)]">
                No results for "{{ query() }}"
              </li>
            }
            @if (!query()) {
              <li class="px-3 py-6 text-center text-xs text-[var(--docs-fg-muted)]">
                Search packages, examples, guides, and more.
              </li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class SearchModal {
  protected readonly ui = inject(SearchUiState);
  private readonly engine = inject(SearchEngine);
  protected readonly query = signal('');
  protected readonly results = computed(() => this.engine.search(this.query()));

  protected inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected selectResult(): void {
    this.query.set('');
    this.ui.close();
  }
}
