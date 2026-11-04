import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadScenarioFile, parseScenarioFile, ScenarioLoadError } from './loader.ts';

const example: unknown = JSON.parse(readFileSync('docs/scenario.example.json', 'utf8'));

const fakeFetch = (body: string, status = 200): typeof fetch =>
  (async () => new Response(body, { status })) as typeof fetch;

describe('parseScenarioFile', () => {
  it('aceita o scenario.example.json', () => {
    expect(parseScenarioFile(example).scenarios.map((s) => s.id)).toEqual(['base', 'A', 'B']);
  });

  it('rejeita com erro em português, com o caminho do problema', () => {
    const bad = structuredClone(example) as { meta: { seed: unknown } };
    bad.meta.seed = 'x';
    expect(() => parseScenarioFile(bad)).toThrow(ScenarioLoadError);
    expect(() => parseScenarioFile(bad)).toThrow(/meta\.seed: .*número/);
  });
});

describe('loadScenarioFile', () => {
  it('busca e valida', async () => {
    const f = await loadScenarioFile('/scenario.json', fakeFetch(JSON.stringify(example)));
    expect(f.ships).toHaveLength(7);
  });

  it('HTTP 404 sugere rodar o gerador', async () => {
    await expect(loadScenarioFile('/scenario.json', fakeFetch('', 404))).rejects.toThrow(/npm run generate/);
  });

  it('JSON quebrado vira ScenarioLoadError', async () => {
    await expect(loadScenarioFile('/scenario.json', fakeFetch('{'))).rejects.toThrow(ScenarioLoadError);
  });
});
