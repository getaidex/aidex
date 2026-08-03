/**
 * The Engine ids this Feature Pack will register once execution is
 * implemented. Namespaced `<domain>.<action>`, matching the id shape
 * `@aidex/engines`' EngineRegistry expects — the same convention
 * `@aidex/document`'s DocumentEngineId established. Phase 1 defines these
 * ids only — no Engine implementing them exists yet.
 */
export const ContentEngineId = {
  Generate: 'content.generate',
  Rewrite: 'content.rewrite',
  Expand: 'content.expand',
  Shorten: 'content.shorten',
  Translate: 'content.translate',
  Summarize: 'content.summarize',
  Tone: 'content.tone',
  Seo: 'content.seo',
  Blog: 'content.blog',
  Email: 'content.email',
  Social: 'content.social',
  ProductDescription: 'content.product-description',
  Headline: 'content.headline',
  Tagline: 'content.tagline',
} as const;

export type ContentEngineId = (typeof ContentEngineId)[keyof typeof ContentEngineId];
