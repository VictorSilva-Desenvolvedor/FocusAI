/** Smoke test do funil de advogados. Roda contra o dev server. */
import { chromium } from 'playwright';

const URL = 'http://localhost:5173/#/advogados';
const resultados = [];
const ok = (n, cond, extra = '') =>
  resultados.push(`${cond ? 'PASS' : 'FALHA'}  ${n}${extra ? ` — ${extra}` : ''}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.removeItem('focus.advogados.v1'));
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

const totalCartoes = await page.locator('article').count();
ok('quadro carrega os cartões', totalCartoes === 21, `${totalCartoes} cartões`);

// --- INV-12: sem inscrição conferida não libera acesso ---------------------
await abrirMenu('Freitas & Freitas');
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
ok('cartão recusado permanece onde estava', await cartao('Freitas & Freitas').isVisible());
await esperarAvisoSumir();

// --- ADV-R03: sem tese não libera acesso -----------------------------------
await abrirMenu('Ribeiro Sociedade Individual');
await page.locator('[role="menu"] button', { hasText: 'Acesso liberado' }).click();
await page.waitForTimeout(300);
const avisoTese = await page.locator('[role="status"]').innerText().catch(() => '');
ok('sem tese definida o acesso é recusado', /tese/i.test(avisoTese), avisoTese.trim().slice(0, 70));
await esperarAvisoSumir();

// --- ADV-R02: não pula a qualificação --------------------------------------
// Castro Advogados tem a inscrição conferida de propósito: sem isso, a recusa
// de INV-12 dispararia antes e este teste passaria pelo motivo errado.
await abrirMenu('Castro Advogados');
await page.locator('[role="menu"] button', { hasText: 'Acesso liberado' }).click();
await page.waitForTimeout(300);
const avisoPulo = await page.locator('[role="status"]').innerText().catch(() => '');
ok(
  'não é possível liberar acesso pulando a qualificação',
  /depois da qualificação/i.test(avisoPulo),
  avisoPulo.trim().slice(0, 70),
);
await esperarAvisoSumir();

// --- conferir a inscrição destrava -----------------------------------------
await abrirMenu('Freitas & Freitas');
await page.locator('[role="menu"] button:has-text("Conferir inscrição")').click();
await page.waitForTimeout(400);
const avisoConferido = await page.locator('[role="status"]').innerText().catch(() => '');
ok('conferir inscrição registra a conferência', /conferida/i.test(avisoConferido), avisoConferido.trim());
await esperarAvisoSumir();

await abrirMenu('Freitas & Freitas');
const itemDepois = page.locator('[role="menu"] button', { hasText: 'Acesso liberado' });
ok(
  'depois de conferida, liberar acesso deixa de ser bloqueado por INV-12',
  !/bloqueado/.test(await itemDepois.innerText()),
);
await fecharMenu();

// --- movimento válido -------------------------------------------------------
await abrirMenu('Mendonça Previdência');
await page.locator('[role="menu"] button', { hasText: 'Acesso liberado' }).click();
await page.waitForTimeout(400);
const avisoOk = await page.locator('[role="status"]').innerText().catch(() => '');
ok('movimento válido é aplicado', /Acesso liberado/.test(avisoOk), avisoOk.trim());
await esperarAvisoSumir();

// --- ADV-R05: encerrar exige motivo -----------------------------------------
await abrirMenu('Peixoto Sociedade de Advogados');
await page.locator('[role="menu"] button', { hasText: 'Perdido' }).click();
await page.waitForSelector('[role="dialog"]');
const botaoPerder = page.locator('[role="dialog"] button', { hasText: 'Marcar como perdido' });
ok('perder abre modal com botão travado sem motivo', await botaoPerder.isDisabled());

await page.fill('[role="dialog"] textarea', 'Preço por lead acima do ticket da região.');
await page.waitForTimeout(150);
ok('motivo preenchido libera o botão', !(await botaoPerder.isDisabled()));
await botaoPerder.click();
await page.waitForTimeout(400);

const sumiu = (await page.locator('article', { hasText: 'Peixoto Sociedade' }).count()) === 0;
ok('perdido sai do quadro', sumiu);

await page.click('button:has-text("Encerrados")');
await page.waitForTimeout(300);
const comMotivo = await page.locator('text=Preço por lead acima do ticket da região.').count();
ok('perdido aparece em Encerrados com o motivo', comMotivo === 1);
await page.click('button:has-text("Encerrados")');

// --- persistência ------------------------------------------------------------
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('article');
const aposReload = (await page.locator('article', { hasText: 'Peixoto Sociedade' }).count()) === 0;
ok('movimentos sobrevivem ao reload', aposReload);

// --- filtros e visão ---------------------------------------------------------
await page.fill('input[aria-label="Buscar advogados"]', 'Castro');
await page
  .waitForFunction(() => document.querySelectorAll('article').length < 5, null, { timeout: 5000 })
  .catch(() => {});
const filtrados = await page.locator('article').count();
ok('busca casa por nome', filtrados === 1, `${filtrados} cartões`);
await page.fill('input[aria-label="Buscar advogados"]', '');
await page.waitForTimeout(200);

await page.click('button[title="Tabela"]');
await page.waitForSelector('table');
const linhas = await page.locator('tbody tr').count();
// 21 no quadro menos o que acabou de ser marcado como perdido.
ok('visão de tabela lista os mesmos advogados', linhas === 20, `${linhas} linhas`);

// --- carteira própria ---------------------------------------------------------
await page.selectOption('select[aria-label="Trocar perfil de demonstração"]', 'u-sdr');
await page.waitForTimeout(400);
const linhasSdr = await page.locator('tbody tr').count();
ok('SDR vê apenas a própria carteira', linhasSdr > 0 && linhasSdr < 20, `${linhasSdr} linhas`);
const temFiltroResp = await page.locator('select[aria-label="Filtrar por responsável"]').count();
ok('filtro de responsável some para quem só vê a própria carteira', temFiltroResp === 0);

// --- cadastro ------------------------------------------------------------------
await page.selectOption('select[aria-label="Trocar perfil de demonstração"]', 'u-adm');
await page.waitForTimeout(300);
await page.click('button:has-text("Kanban")');
await page.waitForTimeout(200);
await page.click('text=Novo advogado');
await page.waitForSelector('[role="dialog"]');
await page.click('[role="dialog"] button:has-text("Criar advogado")');
await page.waitForTimeout(200);
const errosVazio = await page.locator('[role="dialog"] p.campo-mensagem-erro').count();
ok('cadastro vazio acusa os campos obrigatórios', errosVazio === 8, `${errosVazio} erros`);

await page.fill('[role="dialog"] input[placeholder="Silva & Associados"]', 'Moura Advocacia');
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

// --- limpeza --------------------------------------------------------------------
await page.evaluate(() => localStorage.removeItem('focus.advogados.v1'));
await browser.close();

console.log(resultados.join('\n'));
console.log(`\n${resultados.filter((r) => r.startsWith('PASS')).length}/${resultados.length} passaram`);
if (erros.length) {
  console.log('\nErros de console:');
  erros.forEach((e) => console.log(`  ${e}`));
}
process.exit(resultados.some((r) => r.startsWith('FALHA')) || erros.length ? 1 : 0);
