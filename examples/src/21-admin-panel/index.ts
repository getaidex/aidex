/**
 * 21 — Admin Panel
 *
 * Narrates the same wiring the AdminPanel React component (AdminPanel.tsx)
 * renders — ConnectionManager + AIFeatureControl + ObservabilityBus feeding
 * both AdminController (read/command layer) and Aidex (execution) — without
 * needing a browser. The React UI itself is exercised by AdminPanel.test.ts
 * via @testing-library/react; this script proves the same architecture at
 * the kernel level: AI disabled rejects before the provider is ever called,
 * re-enabling works immediately, and a feature-level override is
 * independent of the global flag.
 */
import { AIDisabledError } from '@aidex/ai-control';
import { buildDemo, runAI, STRATEGY_NAME } from './setup.js';

async function main() {
  const demo = buildDemo();

  console.log('Initial snapshot:', demo.admin.getSnapshot());

  console.log('\n1. Running AI while enabled...');
  console.log('   Result:', await runAI(demo, 'why is the sky blue?'));

  console.log('\n2. Disabling AI globally via AdminController...');
  demo.admin.setAIEnabled(false);
  console.log('   Snapshot health:', demo.admin.getSnapshot().health);

  console.log('\n3. Attempting execution while disabled...');
  try {
    await runAI(demo, 'this should not run');
    console.log('   Unexpected: execution succeeded while disabled.');
  } catch (error) {
    console.log('   Rejected as expected:', error instanceof AIDisabledError ? error.message : error);
  }

  console.log('\n4. Re-enabling AI...');
  demo.admin.setAIEnabled(true);
  console.log('   Result:', await runAI(demo, 'why is the sky blue?'));

  console.log(`\n5. Disabling just the "${STRATEGY_NAME}" feature (global stays enabled)...`);
  demo.admin.setFeatureEnabled(STRATEGY_NAME, false);
  try {
    await runAI(demo, 'this should also be blocked');
    console.log('   Unexpected: execution succeeded while the feature was disabled.');
  } catch (error) {
    console.log('   Rejected as expected:', error instanceof AIDisabledError ? error.message : error);
  }
  demo.admin.clearFeatureOverride(STRATEGY_NAME);

  console.log('\n6. Final Admin snapshot:');
  console.log(demo.admin.getSnapshot());
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
