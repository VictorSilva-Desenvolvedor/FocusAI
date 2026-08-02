/**
 * Regera `src/servicos/banco.types.ts` a partir do schema real.
 *
 * Rode depois de cada migration. Sem os tipos gerados o cliente não conhece o
 * formato de nenhuma tabela e devolve `GenericStringError` em toda consulta —
 * que só passa no typecheck com asserção, e asserção aqui é o mesmo que
 * desligar a verificação justamente na fronteira onde o formato pode divergir
 * sem ninguém perceber.
 *
 * Precisa de `SUPABASE_ACCESS_TOKEN` em `.secrets/supabase.env`.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.secrets/supabase.env', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

if (!env.SUPABASE_ACCESS_TOKEN) {
  console.error('Falta SUPABASE_ACCESS_TOKEN em .secrets/supabase.env.');
  process.exit(1);
}

const referencia = new URL(env.SUPABASE_URL).hostname.split('.')[0];

const resposta = await fetch(
  `https://api.supabase.com/v1/projects/${referencia}/types/typescript`,
  { headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` } },
);

const corpo = await resposta.json();

if (!resposta.ok || !corpo.types) {
  console.error(`Falha ao gerar tipos (HTTP ${resposta.status}):`, JSON.stringify(corpo).slice(0, 300));
  process.exit(1);
}

const cabecalho = `/*
 * Gerado a partir do schema do Supabase. Não edite à mão.
 *
 * Regerar depois de cada migration:
 *   npm run tipos:banco
 */
`;

writeFileSync('src/servicos/banco.types.ts', cabecalho + corpo.types, 'utf8');
console.log(`src/servicos/banco.types.ts atualizado (${corpo.types.length} caracteres).`);
