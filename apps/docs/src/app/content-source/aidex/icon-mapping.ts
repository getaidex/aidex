import type { IconKind } from '../../engine/motion/animated-icon';

/** Maps Aidex-specific concepts onto the engine's generic icon vocabulary. */

const PACKAGE_ICON_BY_SLUG: Record<string, IconKind> = {
  core: 'nodes',
  sdk: 'bolt',
  providers: 'link',
  strategies: 'layers',
  engines: 'orbit',
  prompts: 'layers',
  tools: 'gear',
  plugins: 'gear',
  workflow: 'pulse',
  memory: 'database',
  observability: 'eye',
  evaluation: 'grid',
  catalog: 'database',
  adapters: 'link',
  cli: 'terminal',
  mcp: 'nodes',
  'mcp-aidex': 'link',
  document: 'grid',
  content: 'grid',
  design: 'grid',
  media: 'grid',
  marketing: 'grid',
};

const LEVEL_ICON_BY_NAME: Record<string, IconKind> = {
  'Getting Started': 'bolt',
  Providers: 'link',
  Documents: 'grid',
  Design: 'grid',
  Marketing: 'grid',
  Workflow: 'pulse',
  Plugins: 'gear',
  'Custom Engines': 'orbit',
  Capstone: 'bubbles',
};

const GUIDE_ICON_BY_SLUG: Record<string, IconKind> = {
  'creating-a-provider': 'link',
  'creating-plugins': 'gear',
  'creating-an-engine': 'orbit',
  'creating-a-workflow': 'pulse',
  'prompt-templates': 'layers',
  observability: 'eye',
  memory: 'database',
  adapters: 'link',
  mcp: 'nodes',
  cli: 'terminal',
};

export function packageIconKind(slug: string): IconKind {
  return PACKAGE_ICON_BY_SLUG[slug] ?? 'grid';
}

export function levelIconKind(levelName: string): IconKind {
  return LEVEL_ICON_BY_NAME[levelName] ?? 'bolt';
}

export function guideIconKind(slug: string): IconKind {
  return GUIDE_ICON_BY_SLUG[slug] ?? 'layers';
}
