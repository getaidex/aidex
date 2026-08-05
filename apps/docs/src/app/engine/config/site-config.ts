import { InjectionToken } from '@angular/core';
import type { NavTree } from '../navigation/navigation.types';

export interface SiteConfig {
  title: string;
  tagline: string;
  githubUrl: string;
  installCommand: string;
  nav: NavTree;
}

/** The one place the generic engine reaches out to product-specific config. */
export const DOCS_SITE_CONFIG = new InjectionToken<SiteConfig>('DOCS_SITE_CONFIG');
