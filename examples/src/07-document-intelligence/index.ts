/**
 * 07 — Document Intelligence
 *
 * @aidex/document is the first "feature package" in this course: a
 * bundle of related engines (extract/summarize/classify/keywords/
 * review) registered together via AIBuilder.use(). Every one of these
 * engines JSON-parses the provider's response, so they throw against
 * StubProvider (which returns plain, non-JSON text) — that's why this
 * example carries its own small demo provider that returns valid JSON
 * shaped for whichever operation you pick, only used when no
 * GEMINI_API_KEY is set.
 *
 * document.ocr is intentionally never offered here — it throws
 * NotImplementedError unconditionally in the current SDK.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { DOCUMENT_FEATURE_PACKAGE, DocumentEngineId } from '@aidex/document';

// `import.meta.dirname` needs Node 20.11+/21.2+ — this repo supports
// Node >=18, so resolve __dirname the portable way instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A single shared readline interface, not one created per prompt:
// rl.question() only reliably resolves once per process when stdin is
// piped (e.g. automated smoke tests) — every prompt after the first
// silently hangs forever. Reading through the interface's line
// iterator instead works correctly both interactively and piped.
// Returns null when stdin has no more input (EOF).
const rl = createInterface({ input: stdin, output: stdout });
const rlLines = rl[Symbol.asyncIterator]();

async function ask(question: string): Promise<string | null> {
  stdout.write(question);
  const { value, done } = await rlLines.next();
  return done ? null : value.trim();
}

const operations = [
  { key: '1', id: DocumentEngineId.Extract, label: 'Extract structured fields' },
  { key: '2', id: DocumentEngineId.Summarize, label: 'Summarize (plain text, not JSON)' },
  { key: '3', id: DocumentEngineId.Classify, label: 'Classify document type' },
  { key: '4', id: DocumentEngineId.Keywords, label: 'Extract keywords' },
  { key: '5', id: DocumentEngineId.Review, label: 'Review for risk findings' },
] as const;

// Canned JSON per operation — only used in demo mode. document.summarize
// is the one exception in this package that expects plain text back, not
// JSON, so its branch below returns a bare string.
function demoResponseFor(engineId: string): string {
  switch (engineId) {
    case DocumentEngineId.Extract:
      return JSON.stringify({
        fields: { vendor: 'Acme Consulting LLC', effectiveDate: 'January 1, 2026' },
        confidence: { vendor: 0.93 },
      });
    case DocumentEngineId.Classify:
      return JSON.stringify({ documentType: 'services-contract', confidence: 0.88 });
    case DocumentEngineId.Keywords:
      return JSON.stringify({ keywords: ['termination', 'liability', 'invoicing', 'consulting rate'] });
    case DocumentEngineId.Review:
      return JSON.stringify({
        findings: [
          {
            issue: 'No notice period required for termination',
            severity: 'high',
            recommendation: 'Add a minimum 30-day written notice requirement for either party.',
          },
        ],
        summary: 'One high-severity gap found in termination terms.',
      });
    default:
      return 'This agreement outlines a monthly-billed consulting arrangement with no termination notice period and limited consultant liability.';
  }
}

function createProvider(selectedEngineId: string): Provider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  return {
    name: 'demo-document-provider',
    async generate() {
      return { content: demoResponseFor(selectedEngineId) };
    },
  };
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY found — using a demo provider with canned JSON per operation.');
    console.log('Set GEMINI_API_KEY to run these against a real model.\n');
  }

  console.log('Choose an operation:');
  for (const op of operations) console.log(`  [${op.key}] ${op.label}`);
  const opChoice = (await ask('> ')) || '1';
  const operation = operations.find((op) => op.key === opChoice) ?? operations[0];

  console.log('\nChoose a document: [1] contract.md  [2] invoice.md');
  const fileChoice = await ask('> ');
  const filename = fileChoice === '2' ? 'invoice.md' : 'contract.md';
  const content = await readFile(path.join(__dirname, 'fixtures', filename), 'utf8');

  const provider = createProvider(operation.id);
  const ai = new AIBuilder().provider(provider).use(DOCUMENT_FEATURE_PACKAGE).build();

  console.log(`\nRunning "${operation.label}" on ${filename}...\n`);
  const result = await ai.engine(operation.id).execute({ source: { content, mimeType: 'text/plain' } });
  console.log(JSON.stringify(result, null, 2));
  rl.close();
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
