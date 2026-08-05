import { InjectionToken, Type } from '@angular/core';
import type { NavTree } from '../navigation/navigation.types';

export interface SiteConfig {
  title: string;
  tagline: string;
  githubUrl: string;
  installCommand: string;
  nav: NavTree;
  /** Rendered via NgComponentOutlet in the top bar — the engine never imports a concrete logo. */
  logoComponent: Type<unknown>;
}

/** The one place the generic engine reaches out to product-specific config. */
export const DOCS_SITE_CONFIG = new InjectionToken<SiteConfig>('DOCS_SITE_CONFIG');
