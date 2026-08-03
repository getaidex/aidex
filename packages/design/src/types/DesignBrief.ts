import type { DesignOutputFormat } from './DesignOutputFormat.js';

/**
 * The one shape every request in this pack genuinely shares — not
 * because every engine is superficially "design-related", but because
 * every one of the 14 actually needs a creative brief, benefits from
 * knowing who it's for, benefits from a style hint, and produces some
 * kind of file. `dimensions`/`platform`/`branding`/`assets` are
 * deliberately NOT here even though several engines use them: they don't
 * apply to all 14 (a color palette has no "platform"; a brand-identity
 * request has no "existing branding" to respect), so each request opts
 * into them individually instead of every request inheriting fields most
 * of them would never use. Written for the same generic creative
 * workflows any marketing team, agency, ecommerce brand, startup, social
 * media manager, print company, or enterprise design system would
 * recognize — not modeled after one specific application.
 */
export interface DesignBrief {
  readonly brief: string;
  readonly targetAudience?: string;
  readonly style?: string;
  readonly outputFormat?: DesignOutputFormat;
}
