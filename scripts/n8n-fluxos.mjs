/**
 * Exporta os fluxos do n8n para `automacoes/n8n/`, um arquivo por fluxo.
 *
 *   npm run n8n:fluxos
 *
 * API-R16 — fluxo que vive só dentro da ferramenta de automação é lógica de
 * negócio fora do repositório: sem revisão, sem histórico e sem como saber o que
 * mudou depois que alguém arrastou um nó. Este script é o lado "ou versiona" da
 * regra. Roda contra a API pública do n8n, fora do navegador (API-R01).
 *
 * Ele lê e nada mais: não importa, não altera e não ativa fluxo. Publicar de
 * volta a partir do arquivo é outra demanda — e é a que precisa de cuidado, não
 * esta.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const DESTINO = 'automacoes/n8n';

const env = Object.fromEntries(
  readFileSync('.secrets/n8n.env', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

for (const chave of ['N8N_BASE_URL', 'N8N_API_KEY']) {
  if (!env[chave]) {
    console.error(`Falta ${chave} em .secrets/n8n.env.`);
    process.exit(1);
  }
}

const raiz = env.N8N_BASE_URL.replace(/\/+$/, '');

/*
 * Campos que NÃO vão para o Git, e o motivo de cada um:
 *
 *  - `pinData` guarda o dado fixado nos nós durante o teste, e esse dado sai de
 *    execução real: nome e telefone de cliente final. Versionar isso é colocar
 *    dado pessoal no repositório disfarçado de fixture — exatamente o que a
 *    regra da seed fictícia proíbe, e aqui o dado é de quem não autorizou nada.
 *  - `staticData` guarda cursor e token que o fluxo carrega entre execuções.
 *  - `versionId` e `updatedAt` mudam a cada salvamento no n8n e produziriam
 *    diff em todo fluxo, todo dia, sem nenhuma mudança de comportamento.
 */
const VOLATEIS = ['pinData', 'staticData', 'versionId', 'updatedAt', 'triggerCount'];

/*
 * API-R07 do outro lado do balcão: a API do n8n pagina por cursor e o corte é
 * silencioso — sem o laço, um n8n com muitos fluxos exporta a primeira página e
 * o restante simplesmente não existe no repositório.
 */
async function todosOsFluxos() {
  const fluxos = [];
  let cursor = null;

  do {
    const url = new URL(`${raiz}/api/v1/workflows`);
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);

    const resposta = await fetch(url, {
      headers: { 'X-N8N-API-KEY': env.N8N_API_KEY, accept: 'application/json' },
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      throw new Error(
        `${resposta.status} ${resposta.statusText} em ${url.pathname} — ${corpo.slice(0, 300)}`,
      );
    }

    const pagina = await resposta.json();
    fluxos.push(...(pagina.data ?? []));
    cursor = pagina.nextCursor ?? null;
  } while (cursor);

  return fluxos;
}

/** Chave ordenada em toda profundidade: sem isso o diff mexe sozinho. */
function estavel(valor) {
  if (Array.isArray(valor)) return valor.map(estavel);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.keys(valor)
        .sort()
        .map((k) => [k, estavel(valor[k])]),
    );
  }
  return valor;
}

function nomeDeArquivo(fluxo) {
  const slug = String(fluxo.name ?? 'sem-nome')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'sem-nome'}.${fluxo.id}.json`;
}

/*
 * O n8n guarda credencial fora do fluxo e exporta só a referência — mas nada
 * impede alguém de colar um token direto num nó de HTTP Request, e é o que
 * acontece quando a pressa fala mais alto. Um segredo assim entra no Git no
 * primeiro `git add` e continua lá depois de removido do arquivo.
 */
const SUSPEITAS = [
  [/\bsb_secret_[A-Za-z0-9_-]+/g, 'chave secreta do Supabase'],
  [/\bsbp_[A-Za-z0-9]{20,}/g, 'token de conta do Supabase'],
  [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, 'JWT literal'],
  [/\bBearer\s+[A-Za-z0-9._-]{20,}/g, 'cabeçalho Authorization com valor fixo'],
  [/\bsk-[A-Za-z0-9]{20,}/g, 'chave de API de provedor de modelo'],

  /*
   * Dado real é o outro lado do mesmo problema, e o mais fácil de deixar passar
   * porque não parece credencial. O repositório não versiona telefone de
   * pessoa, e-mail nominal nem id de recurso de conta de ninguém — a regra vale
   * inclusive para e-mail de colega, e é a mesma que mantém a seed fictícia.
   */
  [/\+?55\s?\(?\d{2}\)?\s?9?\d{4}[- ]?\d{4}/g, 'telefone brasileiro'],
  [/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, 'CPF'],
  [
    /[A-Za-z0-9._%+-]+@(?!exemplo\.|example\.|focus\.ai\b|n8n\.io\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    'e-mail ou id de agenda',
  ],
];

function achadosEm(texto) {
  return SUSPEITAS.flatMap(([padrao, rotulo]) => (padrao.test(texto) ? [rotulo] : []));
}

const fluxos = await todosOsFluxos();
mkdirSync(DESTINO, { recursive: true });

const achados = [];

for (const fluxo of fluxos) {
  const limpo = { ...fluxo };
  for (const campo of VOLATEIS) delete limpo[campo];

  const json = `${JSON.stringify(estavel(limpo), null, 2)}\n`;
  const arquivo = `${DESTINO}/${nomeDeArquivo(fluxo)}`;
  writeFileSync(arquivo, json, 'utf8');

  const rotulos = achadosEm(json);
  if (rotulos.length > 0) achados.push({ arquivo, rotulos });

  console.log(`${fluxo.active ? 'ativo   ' : 'inativo '} ${arquivo}`);
}

console.log(`\n${fluxos.length} fluxo(s) em ${DESTINO}/.`);

/*
 * API-R10 pelo avesso: achado não pode virar linha de log no meio de um monte
 * de saída verde. O script falha e o `npm run` devolve código diferente de zero.
 * O arquivo fica no disco para ser conferido — `automacoes/n8n/*.json` está no
 * `.gitignore` justamente para que conferir seja um passo e não uma corrida
 * contra um `git add` distraído.
 *
 * `process.exitCode` em vez de `process.exit(1)`: sair no meio do evento aborta
 * o processo com asserção do libuv no Windows, e o código de saída passa a ser
 * de crash em vez do 1 que este bloco quis dizer.
 */
if (achados.length > 0) {
  console.error('\nSegredo ou dado real dentro do fluxo — NÃO versione antes de conferir:');
  for (const { arquivo, rotulos } of achados) {
    console.error(`  ${arquivo}: ${rotulos.join(', ')}`);
  }
  console.error('\nSegredo mora na credencial do n8n ou em .secrets/, nunca no nó.');
  console.error('Dado de pessoa não mora em arquivo versionado, nem como exemplo.');
  process.exitCode = 1;
}
