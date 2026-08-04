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
import { existsSync, readdirSync, readFileSync, renameSync, mkdirSync, rmSync } from 'node:fs';
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

/*
 * Migration que se declara `NÃO APLICADA` fica de fora.
 *
 * O caso real foi a 0009: ela remove `closer` e `sdr` do enum de papéis e exige
 * passos manuais antes — decidir o destino de quem ainda usa os dois, apagar as
 * contas correspondentes. O cabeçalho dela avisa isso em maiúsculas, e aplicá-la
 * às cegas derrubou o push inteiro.
 *
 * Manter o mesmo recorte da produção também é o ponto: o banco de teste só vale
 * como teste se tiver o esquema que o outro tem. Aplicar aqui uma migration que
 * lá não rodou faria o smoke passar sobre um banco que ninguém opera.
 */
const todas = readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql')).sort();
const adiadas = todas.filter((f) =>
  readFileSync(`supabase/migrations/${f}`, 'utf8').slice(0, 1200).includes('NÃO APLICADA'),
);
const migrations = todas.filter((f) => !adiadas.includes(f));

console.log(`Projeto de teste : ${env.SUPABASE_URL}`);
console.log(`Projeto de trabalho: ${trabalho ?? '(não configurado)'}`);
console.log(`Migrations a aplicar: ${migrations.length}`);
for (const m of migrations) console.log(`  · ${m}`);
if (adiadas.length) {
  console.log(`\nAdiadas por se declararem NÃO APLICADA: ${adiadas.length}`);
  for (const m of adiadas) console.log(`  · ${m}`);
}

if (!valer) {
  console.log('\nEnsaio. Nada foi escrito. Rode com --valer para aplicar.');
  process.exit(0);
}

/*
 * A CLI do Supabase entra por `npx -y`, sem virar dependência do projeto: ela é
 * ferramenta de operação, não código que o pacote publicado precisa.
 */
/*
 * `supabase db push` não sabe pular arquivo, então as adiadas saem da pasta pelo
 * tempo do comando e voltam no `finally` — inclusive se o push falhar ou o
 * processo for interrompido. Deixá-las fora seria pior que não ter começado.
 */
const ABRIGO = 'supabase/.adiadas';
console.log('\nAplicando as migrations…');
let push;
try {
  if (adiadas.length) {
    mkdirSync(ABRIGO, { recursive: true });
    for (const m of adiadas) renameSync(`supabase/migrations/${m}`, `${ABRIGO}/${m}`);
  }
  push = spawnSync(
    'npx',
    ['-y', 'supabase@latest', 'db', 'push', '--db-url', env.SUPABASE_DB_URL, '--include-all'],
    { stdio: 'inherit', shell: true },
  );
} finally {
  for (const m of adiadas) {
    if (existsSync(`${ABRIGO}/${m}`)) renameSync(`${ABRIGO}/${m}`, `supabase/migrations/${m}`);
  }
  rmSync(ABRIGO, { recursive: true, force: true });
}

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
