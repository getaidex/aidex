import type { DesignBranding } from './DesignBranding.js';
import type { DesignBrief } from './DesignBrief.js';
import type { DesignFontPairing } from './DesignFontPairing.js';

/** `branding`, when supplied, lets the pairing complement an existing brand font rather than starting from nothing. */
export interface DesignTypographyRequest extends DesignBrief {
  readonly branding?: DesignBranding;
  readonly pairingCount?: number;
}

export interface DesignTypographyResult {
  readonly pairings: readonly DesignFontPairing[];
}
