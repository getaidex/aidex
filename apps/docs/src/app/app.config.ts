import { ApplicationConfig, inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { aidexSiteConfig } from './content-source/aidex/docs.config';
import searchIndex from './content/generated/search-index.json';
import { DOCS_SITE_CONFIG } from './engine/config/site-config';
import { SearchEngine } from './engine/search/search-engine.service';
import type { SearchDocument } from './engine/search/search.types';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
    ),
    { provide: DOCS_SITE_CONFIG, useValue: aidexSiteConfig },
    provideAppInitializer(() => {
      inject(SearchEngine).load(searchIndex as SearchDocument[]);
    }),
  ],
};
