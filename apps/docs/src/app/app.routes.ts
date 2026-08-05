import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./content-source/aidex/pages/home/home-page').then((m) => m.HomePage),
    title: 'Aidex — a modular, provider-agnostic AI application platform',
  },
  {
    path: 'getting-started',
    loadComponent: () =>
      import('./content-source/aidex/pages/getting-started/getting-started-page').then(
        (m) => m.GettingStartedPage
      ),
    title: 'Getting Started — Aidex',
  },
  {
    path: 'examples',
    loadComponent: () =>
      import('./content-source/aidex/pages/examples/examples-page').then((m) => m.ExamplesPage),
    title: 'Examples — Aidex',
  },
  {
    path: 'examples/:slug',
    loadComponent: () =>
      import('./content-source/aidex/pages/examples/example-detail-page').then((m) => m.ExampleDetailPage),
    title: 'Example — Aidex',
  },
  {
    path: 'packages',
    loadComponent: () =>
      import('./content-source/aidex/pages/packages/packages-page').then((m) => m.PackagesPage),
    title: 'Packages — Aidex',
  },
  {
    path: 'packages/:slug',
    loadComponent: () =>
      import('./content-source/aidex/pages/packages/package-detail-page').then((m) => m.PackageDetailPage),
    title: 'Package — Aidex',
  },
  {
    path: 'architecture',
    loadComponent: () =>
      import('./content-source/aidex/pages/architecture/architecture-page').then((m) => m.ArchitecturePage),
    title: 'Architecture — Aidex',
  },
  {
    path: 'guides',
    loadComponent: () => import('./content-source/aidex/pages/guides/guides-page').then((m) => m.GuidesPage),
    title: 'Guides — Aidex',
  },
  {
    path: 'guides/:slug',
    loadComponent: () =>
      import('./content-source/aidex/pages/guides/guide-detail-page').then((m) => m.GuideDetailPage),
    title: 'Guide — Aidex',
  },
  {
    path: 'reference',
    loadComponent: () =>
      import('./content-source/aidex/pages/reference/reference-page').then((m) => m.ReferencePage),
    title: 'API Reference — Aidex',
  },
  {
    path: 'roadmap',
    loadComponent: () => import('./content-source/aidex/pages/roadmap/roadmap-page').then((m) => m.RoadmapPage),
    title: 'Roadmap — Aidex',
  },
  {
    path: 'faq',
    loadComponent: () => import('./content-source/aidex/pages/faq/faq-page').then((m) => m.FaqPage),
    title: 'FAQ — Aidex',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./content-source/aidex/pages/not-found/not-found-page').then((m) => m.NotFoundPage),
    title: 'Page not found — Aidex',
  },
];
