import type { AdminController } from '@aidex/admin';
import { useAdmin } from '../useAdmin.js';

export interface AIControlProps {
  controller: AdminController;
  features?: readonly string[];
  className?: string;
}

/** Union of declared + overridden feature ids, in that order, deduped. */
function mergeFeatureIds(declared: readonly string[], overridden: readonly string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const id of [...declared, ...overridden]) {
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(id);
    }
  }
  return merged;
}

export function AIControl({ controller, features = [], className }: AIControlProps) {
  const snapshot = useAdmin(controller);
  const aiControl = snapshot.aiControl;
  const featureIds = mergeFeatureIds(features, Object.keys(aiControl.features));

  return (
    <section className={className} data-testid="ai-control">
      <h2>AI Control</h2>
      <label>
        <input
          type="checkbox"
          data-testid="ai-control-global-toggle"
          checked={aiControl.enabled}
          onChange={(event) => controller.setAIEnabled(event.target.checked)}
        />
        AI enabled globally
      </label>
      <ul>
        {featureIds.map((featureId) => {
          const hasOverride = featureId in aiControl.features;
          const effectiveEnabled = aiControl.enabled && (hasOverride ? aiControl.features[featureId] : true);

          return (
            <li key={featureId} data-testid={`ai-control-feature-${featureId}`}>
              <label>
                <input
                  type="checkbox"
                  data-testid={`ai-control-feature-toggle-${featureId}`}
                  checked={effectiveEnabled}
                  onChange={(event) => controller.setFeatureEnabled(featureId, event.target.checked)}
                />
                {featureId}
              </label>
              {hasOverride && (
                <button
                  type="button"
                  data-testid={`ai-control-feature-clear-${featureId}`}
                  onClick={() => controller.clearFeatureOverride(featureId)}
                >
                  Clear override
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
