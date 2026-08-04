/**
 * 16 — Framework Adapters (Bonus)
 *
 * @aidex/adapters does no AI logic of its own — it's a thin translation
 * layer between a framework's call shape and one shared AI instance's
 * ai.text(). This example builds one AI, wraps it in both adapters, and
 * shows they both delegate to the exact same underlying call.
 */
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';
import { ExpressAdapter, NodeAdapter } from '@aidex/adapters';

function createProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  console.log('No GEMINI_API_KEY found — using StubProvider (demo mode).\n');
  return new StubProvider();
}

async function main() {
  const ai = new AIBuilder().provider(createProvider()).build();
  const prompt = 'Suggest a name for a note-taking app.';

  // NodeAdapter: the shape a plain script or function call site wants —
  // just a string in, a string out.
  const nodeAdapter = new NodeAdapter(ai);
  const nodeResult = await nodeAdapter.executeText(prompt);
  console.log('NodeAdapter result:', nodeResult);

  // ExpressAdapter: the shape an Express route handler wants — a
  // {prompt} request object in, a {result} response object out. This
  // example never imports express itself; the adapter's contract is
  // just those two plain object shapes.
  const expressAdapter = new ExpressAdapter(ai);
  const expressResponse = await expressAdapter.handleRequest({ prompt });
  console.log('ExpressAdapter result:', expressResponse.result);

  console.log(
    '\nBoth adapters delegate to the same ai.text() call underneath —',
    nodeResult === expressResponse.result ? 'identical output, as expected.' : 'output differs (only possible with a live, non-deterministic provider).'
  );

  // Adapters validate input the same way ai.text() itself would.
  try {
    await nodeAdapter.executeText('');
  } catch (error) {
    console.log('\nEmpty input correctly rejected:', (error as Error).message);
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
