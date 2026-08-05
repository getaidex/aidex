import type { SiteConfig } from '../../engine/config/site-config';
import { AidexLogo } from './brand/aidex-logo';

/**
 * The one file that makes this deployment "the Aidex docs" instead of docs
 * for anything else. Porting this engine to Inkrix, Prixend, or another
 * project means writing a new content-source/<project>/ folder and swapping
 * the provider in app.config.ts — nothing under engine/ changes.
 */
export const aidexSiteConfig: SiteConfig = {
  title: 'Aidex',
  tagline: 'A modular, provider-agnostic AI application platform.',
  githubUrl: 'https://github.com/getaidex/aidex',
  installCommand: 'pnpm add @aidex/sdk',
  logoComponent: AidexLogo,
  nav: {
    sections: [
      {
        label: 'Start',
        children: [{ label: 'Getting Started', path: '/getting-started' }],
      },
      {
        label: 'Learn',
        children: [
          { label: 'Examples', path: '/examples' },
          { label: 'Packages', path: '/packages' },
          { label: 'Architecture', path: '/architecture' },
          { label: 'Guides', path: '/guides' },
        ],
      },
      {
        label: 'Reference',
        children: [
          { label: 'API Reference', path: '/reference' },
          { label: 'Roadmap', path: '/roadmap' },
          { label: 'FAQ', path: '/faq' },
        ],
      },
    ],
  },
};
