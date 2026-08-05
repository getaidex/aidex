import { Injectable, signal } from '@angular/core';

/** Open/close state for the search modal, plus the Cmd/Ctrl+K and Escape shortcuts. */
@Injectable({ providedIn: 'root' })
export class SearchUiState {
  readonly isOpen = signal(false);

  constructor() {
    if (typeof document === 'undefined') return;
    document.addEventListener('keydown', (event) => {
      const isModK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isModK) {
        event.preventDefault();
        this.toggle();
        return;
      }
      if (event.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update((value) => !value);
  }
}
