/**
 * 08 — Resume Analyzer
 *
 * resume.analyze is one focused engine from @aidex/document. Its real
 * output is {candidateName?, skills, experienceYears?, summary?,
 * matchScore?} — NOT strengths/weaknesses/an ATS score. matchScore
 * (0-100) only gets populated when you supply a jobDescription; without
 * one the model is instructed to leave it null. This example is
 * deliberately built around the engine's actual contract rather than a
 * wishlist of fields it doesn't have.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { DOCUMENT_FEATURE_PACKAGE, DocumentEngineId } from '@aidex/document';

// `import.meta.dirname` needs Node 20.11+/21.2+ — this repo supports
// Node >=18, so resolve __dirname the portable way instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createProvider(): Provider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  console.log('No GEMINI_API_KEY found — using a demo provider with a canned analysis.\n');
  return {
    name: 'demo-resume-provider',
    async generate() {
      return {
        content: JSON.stringify({
          candidateName: 'Jordan Rivera',
          skills: ['TypeScript', 'Node.js', 'Go', 'Kafka', 'Kubernetes'],
          experienceYears: 6,
          summary: 'Backend engineer with strong distributed-systems and event-driven architecture background.',
          matchScore: 82,
        }),
      };
    },
  };
}

async function main() {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const resume = await readFile(path.join(fixturesDir, 'resume.md'), 'utf8');
  const jobDescription = await readFile(path.join(fixturesDir, 'job-description.md'), 'utf8');

  const ai = new AIBuilder().provider(createProvider()).use(DOCUMENT_FEATURE_PACKAGE).build();

  const result = await ai.engine(DocumentEngineId.ResumeAnalyze).execute({
    source: { content: resume, mimeType: 'text/plain' },
    jobDescription,
  });

  const analysis = result as {
    candidateName?: string;
    skills: string[];
    experienceYears?: number;
    summary?: string;
    matchScore?: number;
  };

  console.log(`Candidate: ${analysis.candidateName ?? 'unknown'}`);
  console.log(`Experience: ${analysis.experienceYears ?? 'unknown'} years`);
  console.log(`Skills: ${analysis.skills.join(', ')}`);
  console.log(`Summary: ${analysis.summary ?? 'n/a'}`);
  console.log(
    `Match score against job description: ${analysis.matchScore ?? 'n/a'}/100` +
      ' (only populated when a jobDescription is supplied — omit it and this stays unset)'
  );
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
