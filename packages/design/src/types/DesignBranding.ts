/**
 * Existing brand guidelines to respect when generating *for* an
 * established brand — a marketing team's poster, an agency's client
 * banner, an ecommerce store's social post. Not meaningful for
 * `design.brand` itself, which creates a brand identity rather than
 * respecting one that already exists.
 */
export interface DesignBranding {
  readonly brandName?: string;
  readonly colors?: readonly string[];
  readonly fonts?: readonly string[];
  readonly logoAssetUrl?: string;
}
