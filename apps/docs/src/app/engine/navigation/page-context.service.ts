import { Injectable, signal } from '@angular/core';

/** Lets the active page tell the shell its display title, for breadcrumbs on dynamic routes. */
@Injectable({ providedIn: 'root' })
export class PageContext {
  readonly title = signal<string | null>(null);

  setTitle(title: string | null): void {
    this.title.set(title);
  }
}
