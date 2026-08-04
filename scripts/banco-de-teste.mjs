/**
 * Prepara um projeto Supabase separado para os testes.
 *
 *   npm run banco:teste            # confere e relata, sem escrever
 *   npm run banco:teste -- --valer # aplica as migrations e cria as contas
 *
 * ---------------------------------------------------------------------------
 * Por que um banco separado
 * ---------------------------------------------------------------------------
 *
 * `npm run smoke` compra e devolve lead. Contra o projeto de trabalho isso é
 * irreversível por construção: o carimbo do comprador não se altera (`INV-13`)
 * e o extrato não aceita `delete` (`INV-15`). O resultado medido foi que a
 * segunda execução já encontra o funil diferente e a terceira não roda — o
 * teste consumiu os próprios cenários.
 *
 * Some-se a isso que a seed usa datas relativas (`now() + interval '2 days'`):
 * uma semana depois, as reuniões do catálogo estão vencidas e não há o que
 * comprar. Reaplicar a seed conserta os dois de uma vez, e reaplicar só é
 * seguro onde não existe lead de pessoa real.
 *
 * Quando a captação estiver ligada, este deixa de ser um problema de conforto:
 * rodar o smoke no projeto de trabalho passaria a queimar lead de gente de
 * verdade, com o telefone exposto a uma carteira que não comprou nada.
 *
 * ---------------------------------------------------------------------------
 * O que preencher antes
 * ---------------------------------------------------------------------------
 *
 * Crie um projeto novo no painel do Supabase e preencha
 * `.secrets/supabase-teste.env` (não versionado):
 *
 *   SUPABASE_URL=https://<ref>.supabase.co
 *   SUPABASE_SECRET_KEY=sb_secret_...        # Project Settings › API
 *   SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
 *   SUPABASE_DB_URL=postgresql://...          # Project Settings › Database › URI
 *   SUPABASE_SENHA_TESTE=...
 *   SUPABASE_SENHA_ADMIN=...
 *
 * E `.env.teste.local`, que é o que o dev server lê em modo de teste:
 *
 *   VITE_SUPABASE_URL=<o mesmo SUPABASE_URL>
 *   VITE_SUPABASE_PUBLISHABLE_KEY=<a mesma publicável>
 *
 * Depois: `npm run dev:teste` num terminal e `npm run smoke` no outro.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { lerSegredos, exigir } from './segredos.mjs';

const ARQUIVO = '.secrets/supabase-teste.env';
const valer = process.argv.includes('--valer');

if (!existsSync(ARQUIVO)) {
  console.error(`Falta ${ARQUIVO}. O cabeçalho deste script diz o que pôr nele.`);
  process.exit(1);
}

const env = lerSegredos(ARQUIVO);
exigir(
  env,
  ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_DB_URL', 'SUPABASE_SENHA_TESTE', 'SUPABASE_SENHA_ADMIN'],
  ARQUIVO,
);

/*
 * A trava que impede o acidente que este script existe para evitar.
 *
 * Um `.env` copiado do projeto de trabalho e esquecido aqui faria o script
 * apagar e resemear o banco onde os leads reais moram. Comparar o endereço é
 * barato; recuperar `movimentos_creditos` depois de um `db reset` não é
 * possível.
 */
const trabalho = existsSync('.secrets/supabase.env')
  ? lerSegredos('.secrets/supabase.env').SUPABASE_URL
  : null;
if (trabalho && trabalho === env.SUPABASE_URL) {
  console.error('O projeto de teste aponta para o mesmo endereço do de trabalho.');
  console.error('Recusando: reaplicar a seed ali apagaria dado que não se recupera.');
  process.exit(1);
}

const migrations = readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql')).sort();
console.log(`Projeto de teste : ${env.SUPABASE_URL}`);
console.log(`Projeto de trabalho: ${trabalho ?? '(não configurado)'}`);
console.log(`Migrations a aplicar: ${migrations.length}`);
for (const m of migrations) console.log(`  · ${m}`);

if (!valer) {
  console.log('\nEnsaio. Nada foi escrito. Rode com --valer para aplicar.');
  process.exit(0);
}

/*
 * A CLI do Supabase entra por `npx -y`, sem virar dependência do projeto: ela é
 * ferramenta de operação, não código que o pacote publicado precisa.
 */
console.log('\nAplicando as migrations…');
const push = spawnSync(
  'npx',
  ['-y', 'supabase@latest', 'db', 'push', '--db-url', env.SUPABASE_DB_URL, '--include-all'],
  { stdio: 'inherit', shell: true },
);
if (push.status !== 0) {
  console.error('\n`supabase db push` falhou. Nada de contas foi criado.');
  process.exit(1);
}

console.log('\nCriando as contas de acesso…');
const contas = spawnSync('node', ['scripts/contas-de-teste.mjs', '--ambiente', 'teste'], {
  stdio: 'inherit',
  shell: true,
});
process.exit(contas.status ?? 1);
