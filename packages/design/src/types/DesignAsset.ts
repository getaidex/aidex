/** An existing image/logo/icon a caller wants incorporated into a generated design — not one this pack produces. */
export interface DesignAsset {
  readonly url: string;
  readonly type?: 'image' | 'logo' | 'icon' | 'illustration';
  readonly description?: string;
}
