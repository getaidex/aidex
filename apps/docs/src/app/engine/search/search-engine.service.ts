import { Injectable, signal } from '@angular/core';
import MiniSearch from 'minisearch';
import type { SearchDocument } from './search.types';

/**
 * Generic full-text search over a flat document index. Knows nothing about
 * what a "package" or "example" is — content-sources hand it SearchDocument[]
 * built from their own data.
 */
@Injectable({ providedIn: 'root' })
export class SearchEngine {
  private readonly mini = new MiniSearch<SearchDocument>({
    idField: 'id',
    fields: ['title', 'headings', 'keywords', 'excerpt'],
    storeFields: ['title', 'section', 'path', 'excerpt'],
    searchOptions: {
      boost: { title: 4, keywords: 3, headings: 2, excerpt: 1 },
      prefix: true,
      fuzzy: 0.2,
    },
  });

  readonly ready = signal(false);

  load(documents: SearchDocument[]): void {
    if (this.ready()) return;
    this.mini.addAll(documents);
    this.ready.set(true);
  }

  search(query: string, limit = 8): SearchDocument[] {
    if (!query.trim()) return [];
    return this.mini
      .search(query, undefined)
      .slice(0, limit)
      .map((result) => ({
        id: String(result.id),
        title: result['title'] as string,
        section: result['section'] as string,
        path: result['path'] as string,
        excerpt: result['excerpt'] as string,
        headings: [],
        keywords: [],
      }));
  }
}
