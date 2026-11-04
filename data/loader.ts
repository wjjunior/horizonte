// Carga e validação do scenario.json (WAG-734).
// O contrato é o ScenarioFileSchema de docs/schema.ts; aqui só se busca e se valida.

import { z } from 'zod';
import { ScenarioFileSchema } from '../docs/schema.ts';
import type { ScenarioFile } from '../docs/schema.ts';

export const SCENARIO_URL = '/scenario.json';

export class ScenarioLoadError extends Error {
  override name = 'ScenarioLoadError';
}

const ptBR = z.locales.ptBR();

function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>(
    (acc, k) => (typeof k === 'number' ? `${acc}[${k}]` : acc ? `${acc}.${String(k)}` : String(k)),
    '',
  );
}

// Valida um objeto já lido. Lança ScenarioLoadError com a lista de problemas, um por linha.
export function parseScenarioFile(data: unknown): ScenarioFile {
  const r = ScenarioFileSchema.safeParse(data, { error: ptBR.localeError });
  if (r.success) return r.data;
  const lines = r.error.issues.map((i) => `- ${i.path.length ? formatPath(i.path) : '(raiz)'}: ${i.message}`);
  throw new ScenarioLoadError(`scenario.json inválido (${lines.length} problema(s)):\n${lines.join('\n')}`);
}

// Busca e valida o scenario.json. `fetchImpl` existe para os testes.
export async function loadScenarioFile(url = SCENARIO_URL, fetchImpl: typeof fetch = fetch): Promise<ScenarioFile> {
  let res: Response;
  try {
    res = await fetchImpl(url);
  } catch (e) {
    throw new ScenarioLoadError(`não foi possível buscar ${url}: ${(e as Error).message}`);
  }
  if (!res.ok) {
    throw new ScenarioLoadError(
      `não foi possível buscar ${url}: HTTP ${res.status}. Rode "npm run generate" para gerar public/scenario.json.`,
    );
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch (e) {
    throw new ScenarioLoadError(`${url} não é um JSON válido: ${(e as Error).message}`);
  }
  return parseScenarioFile(data);
}
