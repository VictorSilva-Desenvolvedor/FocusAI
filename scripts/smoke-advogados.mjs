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
 * escolhidos para exercer as regras de **lead** — que é outro conjunto de casos.
 *
 * Quatro verificações ficaram sem cenário e estão SUSPENSAS abaixo, cada uma
 * com o motivo. Elas não foram apagadas de propósito: teste removido em silêncio
 * vira cobertura que ninguém sabe que perdeu. Voltam quando houver um banco de
 * teste onde a seed possa ser montada para o funil sem poluir produção.
 *
 * O que continua coberto: INV-12 (sem inscrição conferida não se libera acesso),
 * ADV-R02 (não se pula a qualificação), ADV-R05 (encerrar exige motivo) e a
 * validação inteira do cadastro.
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
 * O `reload` não é supérfluo. Com `HashRouter`, `goto` para outro hash no mesmo
 * documento nem sempre dispara navegação — e `networkidle` resolve na hora,
 * porque não houve rede. Sem recarregar, o seletor é esperado numa tela que
 * ainda é a anterior.
 */
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('article');

const cartao = (nome) => page.locator('article', { hasText: nome }).first();
const abrirMenu = async (nome) => {
  await cartao(nome).click({ button: 'right' });
  await page.waitForSelector('[role="menu"]');
};
const fecharMenu = async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
};
// O aviso de recusa fica 7s na tela de propósito: é texto que precisa ser lido.
const esperarAvisoSumir = () => page.waitForTimeout(7200);

/*
 * Cinco no quadro: a seed tem 6 advogados e um deles (Bastos Advocacia) nasce
 * `perdido`, que é desfecho e fica fora das colunas por desenho.
 */
const totalCartoes = await page.locator('article').count();
ok('quadro carrega os cartões do banco', totalCartoes === 5, `${totalCartoes} cartões`);

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
ok('cartão recusado permanece onde estava', await cartao('Silva & Associados').isVisible());
await esperarAvisoSumir();

// --- conferir a inscrição destrava a primeira trava -------------------------
await abrirMenu('Silva & Associados');
await page.locator('[role="menu"] button:has-text("Conferir inscrição")').click();
await page.waitForTimeout(400);
const avisoConferido = await page.locator('[role="status"]').innerText().catch(() => '');
ok('conferir inscrição registra a conferência', /conferida/i.test(avisoConferido), avisoConferido.trim());
await esperarAvisoSumir();

// --- ADV-R02: conferida a inscrição, ainda não se pula a qualificação -------
// Mesmo advogado, agora com a inscrição conferida e ainda em `novo`: a recusa
// que aparece agora é a da etapa, não mais a da OAB. É a ordem de
// `motivoParaRecusarMovimento` sendo exercida de verdade.
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
  'a seed do banco não tem advogado em `qualificado` com inscrição conferida',
);

// --- ADV-R05: encerrar exige motivo -----------------------------------------
await abrirMenu('Albuquerque Trabalhista');
await page.locator('[role="menu"] button', { hasText: 'Perdido' }).click();
await page.waitForSelector('[role="dialog"]');
const botaoPerder = page.locator('[role="dialog"] button', { hasText: 'Marcar como perdido' });
ok('perder abre modal com botão travado sem motivo', await botaoPerder.isDisabled());

await page.fill('[role="dialog"] textarea', 'Preço por lead acima do ticket da região.');
await page.waitForTimeout(150);
ok('motivo preenchido libera o botão', !(await botaoPerder.isDisabled()));
await botaoPerder.click();
await page.waitForTimeout(400);

const sumiu = (await page.locator('article', { hasText: 'Albuquerque Trabalhista' }).count()) === 0;
ok('perdido sai do quadro', sumiu);

await page.click('button:has-text("Encerrados")');
await page.waitForTimeout(300);
const comMotivo = await page.locator('text=Preço por lead acima do ticket da região.').count();
ok('perdido aparece em Encerrados com o motivo', comMotivo === 1);
await page.click('button:has-text("Encerrados")');

suspenso(
  'movimentos sobrevivem ao reload',
  'a escrita ainda é local: só a leitura migrou para o banco, então recarregar descarta',
);
suspenso(
  'SDR vê apenas a própria carteira (LED-R06)',
  'os advogados da seed do banco estão sem responsável, então toda carteira sai vazia',
);

// --- filtros e visão ---------------------------------------------------------
await page.fill('input[aria-label="Buscar advogados"]', 'Teixeira');
await page
  .waitForFunction(() => document.querySelectorAll('article').length < 4, null, { timeout: 5000 })
  .catch(() => {});
const filtrados = await page.locator('article').count();
ok('busca casa por nome', filtrados === 1, `${filtrados} cartões`);
await page.fill('input[aria-label="Buscar advogados"]', '');
await page.waitForTimeout(200);

await page.click('button[title="Tabela"]');
await page.waitForSelector('table');
const linhas = await page.locator('tbody tr').count();
/*
 * A tabela mostra o mesmo recorte do quadro: desfecho só aparece com o filtro
 * "Encerrados" ligado. Eram 5 no funil e um acabou de virar perdido — restam 4.
 * Os 6 da seed menos os dois perdidos (Bastos, que já nasce assim, e
 * Albuquerque, marcado acima).
 */
ok('visão de tabela mostra o mesmo recorte do quadro', linhas === 4, `${linhas} linhas`);

// --- cadastro ------------------------------------------------------------------
await page.click('button:has-text("Kanban")');
await page.waitForTimeout(200);
await page.click('text=Novo advogado');
await page.waitForSelector('[role="dialog"]');
await page.click('[role="dialog"] button:has-text("Criar advogado")');
await page.waitForTimeout(200);
const errosVazio = await page.locator('[role="dialog"] p.campo-mensagem-erro').count();
ok('cadastro vazio acusa os campos obrigatórios', errosVazio === 8, `${errosVazio} erros`);

await page.fill('[role="dialog"] input[placeholder="Silva & Associados"]', 'Moura Advocacia');
// 104238/GO é a inscrição do Silva & Associados na seed do banco.
await page.fill('[role="dialog"] input[placeholder="123456/GO"]', '104238GO');
await page.waitForTimeout(250);
const oab = await page.inputValue('[role="dialog"] input[placeholder="123456/GO"]');
ok('inscrição é formatada ao digitar', oab === '104238/GO', oab);

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
await page.locator('[role="dialog"] select').nth(3).selectOption('u-closer');
await page.click('[role="dialog"] button:has-text("Criar advogado")');
await page.waitForTimeout(400);

const criouToast = await page.locator('[role="status"]').innerText().catch(() => '');
ok('novo advogado entra em Novo', /Novo/.test(criouToast), criouToast.trim());

// INV-12 — a conta nasce sempre por conferir. Conferência é ato de alguém do
// time, nunca consequência de o formulário ter sido preenchido.
const nascePorConferir = await cartao('Moura Advocacia').innerText();
ok('cadastro nasce com a inscrição por conferir', /por conferir/.test(nascePorConferir));

await browser.close();

console.log(resultados.join('\n'));
const passaram = resultados.filter((r) => r.startsWith('PASS')).length;
const suspensos = resultados.filter((r) => r.startsWith('SUSPENSO')).length;
const verificados = resultados.length - suspensos;
console.log(`\n${passaram}/${verificados} passaram · ${suspensos} suspensos por falta de cenário`);
if (erros.length) {
  console.log('\nErros de console:');
  erros.forEach((e) => console.log(`  ${e}`));
}
process.exit(resultados.some((r) => r.startsWith('FALHA')) || erros.length ? 1 : 0);
