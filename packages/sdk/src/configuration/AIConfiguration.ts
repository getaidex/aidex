import type { Plugin, Provider } from '@aidex/core';

/**
 * Developer-facing configuration only — a Provider instance (constructed by
 * the application, e.g. from @aidex/providers) and optional Plugins. No
 * business configuration, no vendor-specific settings, no application
 * settings: those live on the concrete Provider/Plugin objects themselves.
 */
export interface AIConfiguration {
  provider: Provider;
  plugins?: Plugin[];
}
