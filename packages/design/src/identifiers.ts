/**
 * The Engine ids this Feature Pack will register once execution is
 * implemented. Namespaced `<domain>.<action>`, matching the id shape
 * `@aidex/engines`' EngineRegistry expects — the same convention
 * `@aidex/document`'s DocumentEngineId and `@aidex/content`'s
 * ContentEngineId established. Phase 1 defines these ids only — no
 * Engine implementing them exists yet.
 */
export const DesignEngineId = {
  Generate: 'design.generate',
  Layout: 'design.layout',
  Brand: 'design.brand',
  Palette: 'design.palette',
  Typography: 'design.typography',
  Poster: 'design.poster',
  Flyer: 'design.flyer',
  BusinessCard: 'design.business-card',
  Banner: 'design.banner',
  Logo: 'design.logo',
  SocialPost: 'design.social-post',
  Presentation: 'design.presentation',
  Mockup: 'design.mockup',
  Template: 'design.template',
} as const;

export type DesignEngineId = (typeof DesignEngineId)[keyof typeof DesignEngineId];
