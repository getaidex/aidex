import type { DesignBranding } from './DesignBranding.js';
import type { DesignBrief } from './DesignBrief.js';
import type { DesignColor } from './DesignColor.js';

/** `branding`, when supplied, lets the palette complement an existing brand color rather than starting from nothing. */
export interface DesignPaletteRequest extends DesignBrief {
  readonly branding?: DesignBranding;
  readonly colorCount?: number;
}

export interface DesignPaletteResult {
  readonly colors: readonly DesignColor[];
}
