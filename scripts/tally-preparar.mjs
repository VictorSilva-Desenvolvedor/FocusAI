/**
 * Prepara os formulários do Tally para a atribuição da Meta.
 *
 *   npm run tally:preparar            # confere e relata, sem escrever
 *   npm run tally:preparar -- --valer # aplica
 *   npm run tally:preparar -- --valer --form RGlNYd
 *
 * O que ele garante em cada formulário: um bloco de campos ocultos com os cinco
 * nomes que `public/tally-meta.js` anexa ao link. Sem eles a submissão chega ao
 * servidor sem a identidade do clique, e nenhuma etapa posterior — reunião
 * agendada, lead vendido — pode ser reenviada à Meta (`CMP-R02`).
 *
 * É idempotente: acrescenta só o que falta e não mexe em campo já existente.
 *
 * Duas coisas que ele deliberadamente NÃO faz:
 *
 *  - Não conserta bloco inválido. A API valida o formulário inteiro a cada
 *    escrita, e formulário antigo às vezes carrega inconsistência que nunca
 *    passou por validação. Consertar de passagem seria mudar o formulário que
 *    está no ar sem ninguém ter decidido; aqui a falha é relatada e o
 *    formulário fica de fora.
 *  - Não cria webhook. A chave de API não abre esse endpoint (401) — é na tela
 *    de Integrations do Tally, à mão, junto com a chave de assinatura.
 *
 * Antes de escrever, grava o estado atual em `.tally-backup/` (fora do Git).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const env = Object.fromEntries(
  readFileSync('.secrets/tally.env', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

if (!env.TALLY_API_KEY) {
  console.error('Falta TALLY_API_KEY em .secrets/tally.env.');
  process.exit(1);
}

/*
 * Os mesmos nomes que o script da landing anexa à URL. O Tally casa campo
 * oculto com parâmetro pelo nome, exatamente — `fbp` e `Fbp` são dois campos
 * diferentes, e o segundo chega sempre vazio.
 */
const OCULTOS = ['fbp', 'fbc', 'fbclid', 'pagina', 'evento_id'];

const valer = process.argv.includes('--valer');
const alvo = process.argv[process.argv.indexOf('--form') + 1];
const somente = process.argv.includes('--form') ? alvo : null;

const cabecalho = {
  Authorization: `Bearer ${env.TALLY_API_KEY}`,
  'Content-Type': 'application/json',
};

const api = async (caminho, opcoes = {}) => {
  const resposta = await fetch(`https://api.tally.so${caminho}`, { headers: cabecalho, ...opcoes });
  const texto = await resposta.text();
  let corpo = null;
  try {
    corpo = JSON.parse(texto);
  } catch {
    corpo = texto;
  }
  return { ok: resposta.ok, status: resposta.status, corpo };
};

const lista = await api('/forms');

if (!lista.ok) {
  console.error(`Falha ao listar formulários (HTTP ${lista.status}).`);
  process.exit(1);
}

mkdirSync('.tally-backup', { recursive: true });

let pendentes = 0;
let falhas = 0;

for (const resumo of lista.corpo.items) {
  if (somente && resumo.id !== somente) continue;

  const { ok, corpo: form } = await api(`/forms/${resumo.id}`);
  if (!ok) {
    console.error(`${resumo.id}: não foi possível ler o formulário.`);
    falhas += 1;
    continue;
  }

  const bloco = form.blocks.find((b) => b.type === 'HIDDEN_FIELDS');
  const jaTem = new Set((bloco?.payload?.hiddenFields ?? []).map((c) => c.name));
  const faltando = OCULTOS.filter((nome) => !jaTem.has(nome));

  console.log(`\n${resumo.id} · ${resumo.name.slice(0, 55)}`);
  console.log(`  envios: ${resumo.numberOfSubmissions}`);
  console.log(`  ocultos: ${jaTem.size ? [...jaTem].join(', ') : '—'}`);
  console.log(`  redirecionamento: ${form.settings?.redirectOnCompletion ? 'configurado' : '—'}`);

  if (!faltando.length) {
    console.log('  nada a fazer.');
    continue;
  }

  pendentes += 1;
  console.log(`  falta: ${faltando.join(', ')}`);

  if (!valer) continue;

  writeFileSync(
    `.tally-backup/${resumo.id}.json`,
    JSON.stringify({ blocks: form.blocks, settings: form.settings }, null, 2),
    'utf8',
  );

  const campos = [
    ...(bloco?.payload?.hiddenFields ?? []),
    ...faltando.map((nome) => ({ uuid: randomUUID(), name: nome })),
  ];

  let blocos;
  if (bloco) {
    blocos = form.blocks.map((b) =>
      b.uuid === bloco.uuid ? { ...b, payload: { ...b.payload, hiddenFields: campos } } : b,
    );
  } else {
    /*
     * Campo oculto não conta como conteúdo de página: colocado depois do último
     * `PAGE_BREAK`, deixa uma página vazia e a API recusa o formulário inteiro.
     * Por isso entra logo abaixo do título, antes de qualquer quebra.
     */
    const u = randomUUID();
    const novo = {
      uuid: u,
      groupUuid: u,
      type: 'HIDDEN_FIELDS',
      groupType: 'HIDDEN_FIELDS',
      payload: { hiddenFields: campos },
    };
    blocos = [form.blocks[0], novo, ...form.blocks.slice(1)];
  }

  const escrita = await api(`/forms/${resumo.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ blocks: blocos }),
  });

  if (escrita.ok) {
    console.log('  aplicado.');
  } else {
    falhas += 1;
    const detalhe = escrita.corpo?.message ?? JSON.stringify(escrita.corpo).slice(0, 200);
    console.error(`  RECUSADO (HTTP ${escrita.status}): ${detalhe}`);
    console.error('  o formulário não foi alterado — o estado original está em .tally-backup/.');
  }
}

if (!valer && pendentes) {
  console.log(`\n${pendentes} formulário(s) a ajustar. Rode com --valer para aplicar.`);
}

process.exit(falhas > 0 ? 1 : 0);
