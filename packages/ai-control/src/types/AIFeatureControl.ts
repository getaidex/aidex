/**
 * A read-only snapshot of AI control state — safe to log, serialize, or
 * hand to a future admin layer. Never carries Provider/Connection config or
 * secrets: this package has no knowledge of either.
 */
export interface AIControlState {
  readonly enabled: boolean;
  readonly features: Readonly<Record<string, boolean>>;
}

/**
 * The control surface an application (and, eventually, a framework-agnostic
 * @aidex/admin adapter) uses to govern whether Aidex may run AI execution.
 * "Feature" is deliberately just a string id — this package assigns it no
 * meaning beyond that; AIFeatureControlPlugin is what decides a feature id
 * defaults to the invoked Strategy's name, so no new naming system or
 * application-specific feature list needs to exist here.
 *
 * Global `enabled` always wins: a feature can be turned off while AI is
 * globally on, but no feature-level override can turn AI back on while
 * globally disabled. This keeps the control deterministic — one governing
 * flag, not two independently-authoritative ones.
 */
export interface AIFeatureControl {
  /** True only if AI is globally enabled AND (no feature given, or that feature has no override, or its override is true). */
  isEnabled(feature?: string): boolean;
  setEnabled(enabled: boolean): void;
  setFeatureEnabled(feature: string, enabled: boolean): void;
  /** Removes a feature-level override, so the feature reverts to following the global flag. */
  clearFeatureOverride(feature: string): void;
  getState(): AIControlState;
}
