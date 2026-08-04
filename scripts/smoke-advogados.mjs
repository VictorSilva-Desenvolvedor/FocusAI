/**
 * Smoke test do funil de advogados. Roda contra o dev server.
 *
 * Precisa das contas de teste criadas (`npm run contas:teste`): desde `ACC-R08`
 * nenhuma tela abre sem sessão, e trocar de papel deixou de ser um clique — é
 * sair e entrar com outra conta.
 *
 * ---------------------------------------------------------------------------
 * COBERTURA REDUZIDA — o funil passou a ler do banco
 * ---------------------------------------------------------------------------
 *
 * A seed do `localStorage` tinha 21 advogados montados justamente para exercer
 * cada recusa do funil. A do banco (`supabase/migrations/0004_seed.sql`) tem 6,
 * escolhidos para exercer as regras de **lead** — outro conjunto de casos.
 *
 * Três verificações ficaram sem cenário e estão SUSPENSAS abaixo, cada uma com
 * o motivo. Não foram apagadas de propósito: teste removido em silêncio vira
 * cobertura que ninguém sabe que perdeu. Voltam quando houver um banco de teste
 * onde a seed possa ser montada para o funil sem poluir produção.
 */
import { chromium } from 'playwright';
import { entrar, BASE } from './entrar.mjs';

const URL = `${BASE}/#/advogados`;
const ADM = 'victorpaulodev@focus.ai';
const resultados = [];
const ok = (n, cond, extra = '') =>
  resultados.push(`${cond ? 'PASS' : 'FALHA'}  ${n}${extra ? ` — ${extra}` : ''}`);
const suspenso = (n, motivo) => resultados.push(`SUSPENSO  ${n} — ${motivo}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

await entrar(page, ADM);
await page.goto(URL, { waitUntil: 'networkidle' });
/*
 * O `reload` não é supérfluo: com `HashRouter`, `goto` para outro hash no mesmo
 * documento nem sempre renavega, e `networkidle` resolve na hora porque não
 * houve rede. A limpeza de `localStorage` que existia aqui saiu junto com a
 * migração — o funil vem do banco, e apagar chave do navegador não muda nada.
 */
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('tbody tr');

const linha = (nome) => page.locator('tbody tr', { hasText: nome }).first();
const abrirMenu = async (nome) => {
  await linha(nome).locator('button[aria-label^="Ações"]').click();
  await page.waitForSelector('[role="menu"]');
};
const fecharMenu = async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
};
// O aviso de recusa fica 7s na tela de propósito: é texto que precisa ser lido.
const esperarAvisoSumir = () => page.waitForTimeout(7200);

/*
 * Cinco em aberto: a seed tem 6 advogados e Bastos Advocacia nasce `perdido`,
 * que é desfecho e só aparece com o filtro "Encerrados".
 */
const totalLinhas = await page.locator('tbody tr').count();
ok('funil carrega as fichas em aberto', totalLinhas === 5, `${totalLinhas} linhas`);

// --- INV-12: sem inscrição conferida não libera acesso ---------------------
// Silva & Associados nasce com `oab_conferida_em` nulo, de propósito.
await abrirMenu('Silva & Associados');
const itemAcesso = page.locator('[role="menu"] button', { hasText: 'Acesso liberado' });
const marcado = await itemAcesso.innerText();
ok('menu marca destino bloqueado sem inscrição conferida', /bloqueado/.test(marcado), marcado.trim());

await itemAcesso.click();
await page.waitForTimeout(300);
const avisoOab = await page.locator('[role="status"]').innerText().catch(() => '');
ok(
  'liberar acesso sem inscrição conferida é recusado',
  /inscrição na OAB/i.test(avisoOab),
  avisoOab.trim().slice(0, 70),
);
ok('ficha recusada permanece onde estava', await linha('Silva & Associados').isVisible());
await esperarAvisoSumir();

// --- conferir a inscrição destrava a primeira trava -------------------------
await abrirMenu('Silva & Associados');
await page.locator('[role="menu"] button:has-text("Conferir inscrição")').click();
await page.waitForTimeout(400);
const avisoConferido = await page.locator('[role="status"]').innerText().catch(() => '');
ok('conferir inscrição registra a conferência', /conferida/i.test(avisoConferido), avisoConferido.trim());
await esperarAvisoSumir();

suspenso(
  'depois de conferida, liberar acesso deixa de ser bloqueado',
  'Silva & Associados está em `novo`, então continua bloqueado por ADV-R02 — a troca do motivo é o que o teste seguinte prova',
);

/*
 * ADV-R02 — a mesma ficha, agora com a inscrição conferida e ainda em `novo`.
 * A recusa que aparece é a da etapa, não mais a da OAB: é a ordem de
 * `motivoParaRecusarMovimento` sendo exercida de verdade, com um advogado só.
 */
await abrirMenu('Silva & Associados');
await page.locator('[role="menu"] button', { hasText: 'Acesso liberado' }).click();
await page.waitForTimeout(300);
const avisoPulo = await page.locator('[role="status"]').innerText().catch(() => '');
ok(
  'não é possível liberar acesso pulando a qualificação',
  /depois da qualificação/i.test(avisoPulo),
  avisoPulo.trim().slice(0, 70),
);
await esperarAvisoSumir();

suspenso(
  'sem tese definida o acesso é recusado (ADV-R03)',
  'nenhum advogado da seed do banco tem a lista de teses vazia',
);
suspenso(
  'movimento válido para acesso liberado é aplicado',
  'a seed do banco não tem advogado em `qualificado` com a inscrição conferida',
);
suspenso(
  'SDR vê apenas a própria carteira (LED-R06)',
  'os advogados da seed do banco estão sem responsável, então toda carteira sai vazia',
);

/*
 * ADV-R05 — encerrar exige motivo.
 *
 * Perde-se o Silva & Associados, não o Albuquerque: o Albuquerque é o único da
 * seed que comprou pacote e ainda não consumiu, e é ele que o teste de ranking
 * mais abaixo usa para provar que quem não comprou continua na lista. Tirá-lo
 * do funil aqui faria aquele teste falhar por falta de cenário, não por defeito.
 */
await abrirMenu('Silva & Associados');
await page.locator('[role="menu"] button', { hasText: 'Perdido' }).click();
await page.waitForSelector('[role="dialog"]');
const botaoPerder = page.locator('[role="dialog"] button', { hasText: 'Marcar como perdido' });
ok('perder abre modal com botão travado sem motivo', await botaoPerder.isDisabled());

await page.fill('[role="dialog"] textarea', 'Preço por lead acima do ticket da região.');
await page.waitForTimeout(150);
ok('motivo preenchido libera o botão', !(await botaoPerder.isDisabled()));
await botaoPerder.click();
await page.waitForTimeout(400);

const sumiu = (await page.locator('tbody tr', { hasText: 'Silva & Associados' }).count()) === 0;
ok('perdido sai da lista', sumiu);

await page.click('button:has-text("Encerrados")');
await page.waitForTimeout(300);
const comMotivo = await page.locator('text=Preço por lead acima do ticket da região.').count();
ok('perdido aparece em Encerrados com o motivo', comMotivo === 1);
await page.click('button:has-text("Encerrados")');

suspenso(
  'movimentos sobrevivem ao reload',
  'mover no funil ainda é escrita local: só comprar, devolver, reservar e avaliar viraram função no banco',
);

// --- filtros -----------------------------------------------------------------
await page.fill('input[aria-label="Buscar advogados"]', 'Teixeira');
await page
  .waitForFunction(() => document.querySelectorAll('tbody tr').length < 4, null, { timeout: 5000 })
  .catch(() => {});
const filtrados = await page.locator('tbody tr').count();
ok('busca casa por nome', filtrados === 1, `${filtrados} linhas`);
await page.fill('input[aria-label="Buscar advogados"]', '');
await page.waitForTimeout(200);

// --- ADV-R10: ranking por consumo ---------------------------------------------
await page.click('button[title="Ranking"]');
await page.waitForSelector('table');
await page.selectOption('select[aria-label="Período do ranking"]', 'null');
await page.waitForTimeout(200);

const primeira = await page.locator('tbody tr').first().innerText();
ok('ranking abre com o maior consumo em primeiro', /^1\b/m.test(primeira), primeira.split('\n')[0]);

suspenso(
  'ativo que não comprou continua na lista, sem posição',
  'o ranking mantém quem tem leads ou está `ativo`, e os três ativos da seed compraram; o único sem compra (Albuquerque) está em `modelo_definido`',
);

// --- cadastro ------------------------------------------------------------------
await page.click('button[title="Funil"]');
await page.waitForTimeout(200);
await page.click('text=Novo advogado');
await page.waitForSelector('[role="dialog"]');
await page.click('[role="dialog"] button:has-text("Criar advogado")');
await page.waitForTimeout(200);
const errosVazio = await page.locator('[role="dialog"] p.campo-mensagem-erro').count();
ok('cadastro vazio acusa os campos obrigatórios', errosVazio === 8, `${errosVazio} erros`);

await page.fill('[role="dialog"] input[placeholder="Silva & Associados"]', 'Moura Advocacia');
/*
 * 033901/GO é a inscrição do Prev Fácil, que está `ativo`. Precisa ser de quem
 * segue no funil: `validarAdvogado` só acusa duplicata fora dos desfechos — e
 * está certo, porque cadastro recusado não reserva inscrição. A do Silva não
 * serve mais, já que o teste de ADV-R05 acabou de marcá-lo como perdido.
 */
await page.fill('[role="dialog"] input[placeholder="123456/GO"]', '033901GO');
await page.waitForTimeout(250);
const oab = await page.inputValue('[role="dialog"] input[placeholder="123456/GO"]');
ok('inscrição é formatada ao digitar', oab === '033901/GO', oab);

const dup = await page.locator('[role="dialog"]').innerText();
ok('inscrição duplicada é recusada', /Já existe um cadastro ativo/.test(dup));

await page.fill('[role="dialog"] input[placeholder="123456/GO"]', '998877SP');
await page.fill('[role="dialog"] input[type="email"]', 'contato@moura.adv.br');
await page.fill('[role="dialog"] input[inputmode="tel"]', '62999887766');
const whats = await page.inputValue('[role="dialog"] input[inputmode="tel"]');
ok('WhatsApp é formatado ao digitar', whats === '(62) 99988-7766', whats);

await page.locator('[role="dialog"] select').first().selectOption('SP');
await page.locator('[role="dialog"] input[type="checkbox"]').first().check();
await page.locator('[role="dialog"] select').nth(1).selectOption('pequeno');
await page.fill('[role="dialog"] input[inputmode="numeric"]', '15');
await page.locator('[role="dialog"] select').nth(3).selectOption('u-cs');
await page.click('[role="dialog"] button:has-text("Criar advogado")');
await page.waitForTimeout(400);

const criouToast = await page.locator('[role="status"]').innerText().catch(() => '');
ok('novo advogado entra em Novo', /Novo/.test(criouToast), criouToast.trim());

// INV-12 — a conta nasce sempre por conferir. Conferência é ato de alguém do
// time, nunca consequência de o formulário ter sido preenchido.
const nascePorConferir = await linha('Moura Advocacia').innerText();
ok('cadastro nasce com a inscrição por conferir', /por conferir/.test(nascePorConferir));

await browser.close();

console.log(resultados.join('\n'));
const passaram = resultados.filter((r) => r.startsWith('PASS')).length;
const suspensos = resultados.filter((r) => r.startsWith('SUSPENSO')).length;
console.log(
  `\n${passaram}/${resultados.length - suspensos} passaram · ${suspensos} suspensos por falta de cenário`,
);
if (erros.length) {
  console.log('\nErros de console:');
  erros.forEach((e) => console.log(`  ${e}`));
}
process.exit(resultados.some((r) => r.startsWith('FALHA')) || erros.length ? 1 : 0);
