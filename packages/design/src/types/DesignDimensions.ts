/**
 * Not folded into DesignBrief: canvas dimensions are meaningful for a
 * poster or a banner and meaningless for a color palette or a font
 * pairing. Each request opts in individually rather than every request
 * inheriting a field most of them would never use.
 */
export interface DesignDimensions {
  readonly width: number;
  readonly height: number;
  readonly unit?: 'px' | 'in' | 'cm' | 'mm';
}
