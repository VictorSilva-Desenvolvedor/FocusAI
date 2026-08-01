/** Smoke test do módulo CRM. Roda contra o dev server. */
import { chromium } from 'playwright';

const URL = 'http://localhost:5173/#/crm';
const resultados = [];
const ok = (n, cond, extra = '') =>
  resultados.push(`${cond ? 'PASS' : 'FALHA'}  ${n}${extra ? ` — ${extra}` : ''}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.removeItem('crm.negociacoes.v1'));
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

const totalCartoes = await page.locator('article').count();
ok('quadro carrega os cartões', totalCartoes === 22, `${totalCartoes} cartões`);

// --- CRM-R20: sem conselho não avança -------------------------------------
await abrirMenu('Barros & Lima');
const itemContrato = page.locator('[role="menu"] button', { hasText: 'Contrato assinado' });
const marcado = await itemContrato.innerText();
ok('menu marca destino bloqueado sem conselho', /bloqueado/.test(marcado), marcado.trim());

await itemContrato.click();
await page.waitForTimeout(300);
const avisoConselho = await page.locator('[role="status"]').innerText().catch(() => '');
ok(
  'mover sem conselho é recusado com motivo',
  /conselho regulador/i.test(avisoConselho),
  avisoConselho.trim().slice(0, 60),
);
const aindaEmAndamento = await cartao('Barros & Lima').isVisible();
ok('cartão recusado permanece onde estava', aindaEmAndamento);
await page.waitForTimeout(7200); // deixa o aviso de erro expirar

// --- CRM-R20: não pula conformidade ---------------------------------------
await abrirMenu('Rocha & Teixeira');
await page.locator('[role="menu"] button', { hasText: 'Conta ativa' }).click();
await page.waitForTimeout(300);
const avisoPulo = await page.locator('[role="status"]').innerText().catch(() => '');
ok(
  'não é possível ativar conta pulando conformidade',
  /parecer de conformidade/i.test(avisoPulo),
  avisoPulo.trim().slice(0, 60),
);
await page.waitForTimeout(7200);

// --- movimento válido ------------------------------------------------------
await abrirMenu('Rocha & Teixeira');
await page.locator('[role="menu"] button', { hasText: 'Em conformidade' }).click();
await page.waitForTimeout(400);
const avisoOk = await page.locator('[role="status"]').innerText().catch(() => '');
ok('movimento válido é aplicado', /Em conformidade/.test(avisoOk), avisoOk.trim());

// agora o caminho para conta ativa está aberto
await abrirMenu('Rocha & Teixeira');
const itemAtiva = page.locator('[role="menu"] button', { hasText: 'Conta ativa' });
ok('depois da conformidade, ativar deixa de ser bloqueado', !/bloqueado/.test(await itemAtiva.innerText()));
await fecharMenu();

// --- CRM-R10: perder exige motivo ------------------------------------------
await abrirMenu('Peixoto Advocacia');
await page.locator('[role="menu"] button', { hasText: 'Perdido' }).click();
await page.waitForSelector('[role="dialog"]');
const botaoPerder = page.locator('[role="dialog"] button', { hasText: 'Marcar como perdida' });
ok('perder abre modal com botão travado sem motivo', await botaoPerder.isDisabled());

await page.fill('[role="dialog"] textarea', 'Sem verba no momento.');
await page.waitForTimeout(150);
ok('motivo preenchido libera o botão', !(await botaoPerder.isDisabled()));
await botaoPerder.click();
await page.waitForTimeout(400);

const sumiuDoQuadro = (await page.locator('article', { hasText: 'Peixoto Advocacia' }).count()) === 0;
ok('perdida sai do quadro', sumiuDoQuadro);

await page.click('button:has-text("Encerradas")');
await page.waitForTimeout(300);
const voltouEmEncerradas = await page.locator('text=Sem verba no momento.').count();
ok('perdida aparece em Encerradas com o motivo', voltouEmEncerradas === 1);
await page.click('button:has-text("Encerradas")');

// --- persistência ----------------------------------------------------------
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('article');
const aposReload = (await page.locator('article', { hasText: 'Peixoto Advocacia' }).count()) === 0;
ok('movimentos sobrevivem ao reload', aposReload);

// --- filtros e visão -------------------------------------------------------
await page.fill('input[aria-label="Buscar negociações"]', 'odonto');
// Espera a lista reagir em vez de dormir um tempo fixo: o sleep passava por
// sorte e falhava quando a máquina estava mais carregada.
await page
  .waitForFunction(() => document.querySelectorAll('article').length < 10, null, { timeout: 5000 })
  .catch(() => {});
// 4: três com "Odonto" no nome e "Sorriso & Cia", que casa pelo nicho.
const filtrados = await page.locator('article').count();
ok('busca casa por nome e por nicho', filtrados === 4, `${filtrados} cartões`);
await page.fill('input[aria-label="Buscar negociações"]', '');
await page.waitForTimeout(200);

await page.click('button[title="Tabela"]');
await page.waitForSelector('table');
const linhas = await page.locator('tbody tr').count();
ok('visão de tabela lista as mesmas negociações', linhas === 21, `${linhas} linhas`);

// --- carteira própria ------------------------------------------------------
await page.selectOption('select[aria-label="Trocar perfil de demonstração"]', 'u-sdr');
await page.waitForTimeout(400);
const linhasSdr = await page.locator('tbody tr').count();
ok('SDR vê apenas a própria carteira', linhasSdr > 0 && linhasSdr < 21, `${linhasSdr} linhas`);
const temFiltroResp = await page.locator('select[aria-label="Filtrar por responsável"]').count();
ok('filtro de responsável some para quem só vê a própria carteira', temFiltroResp === 0);

// --- cadastro --------------------------------------------------------------
await page.selectOption('select[aria-label="Trocar perfil de demonstração"]', 'u-adm');
await page.waitForTimeout(300);
await page.click('text=Nova negociação');
await page.waitForSelector('[role="dialog"]');
await page.click('[role="dialog"] button:has-text("Criar negociação")');
await page.waitForTimeout(200);
const errosVazio = await page.locator('[role="dialog"] p.campo-mensagem-erro').count();
ok('cadastro vazio acusa os campos obrigatórios', errosVazio === 6, `${errosVazio} erros`);

await page.fill('[role="dialog"] input[placeholder="Silva & Associados"]', 'Mendonça Previdência');
await page.waitForTimeout(200);
const dup = await page.locator('[role="dialog"]').innerText();
ok('cliente duplicado é recusado', /Já existe uma negociação ativa/.test(dup));

await page.fill('[role="dialog"] input[placeholder="Silva & Associados"]', 'Teixeira Ambiental');
await page.fill('[role="dialog"] input[inputmode="tel"]', '62999887766');
const whats = await page.inputValue('[role="dialog"] input[inputmode="tel"]');
ok('WhatsApp é formatado ao digitar', whats === '(62) 99988-7766', whats);

const nichoDesabilitado = await page.locator('[role="dialog"] select').nth(1).isDisabled();
ok('nicho fica travado até escolher o conselho', nichoDesabilitado);

await page.locator('[role="dialog"] select').first().selectOption('OAB');
await page.waitForTimeout(150);
const nichos = await page.locator('[role="dialog"] select').nth(1).locator('option').count();
ok('nichos são os do conselho escolhido', nichos === 7, `${nichos} opções (1 placeholder + 6)`);

await page.locator('[role="dialog"] select').nth(1).selectOption('Consumidor');
await page.fill('[role="dialog"] input[inputmode="decimal"]', '9.500');
await page.locator('[role="dialog"] select').nth(2).selectOption('Indicação');
await page.locator('[role="dialog"] select').nth(3).selectOption('u-closer');
await page.click('[role="dialog"] button:has-text("Criar negociação")');
await page.waitForTimeout(400);

const criouToast = await page.locator('[role="status"]').innerText().catch(() => '');
ok('nova negociação entra em Em andamento', /Em andamento/.test(criouToast), criouToast.trim());

// --- limpeza ----------------------------------------------------------------
await page.evaluate(() => localStorage.removeItem('crm.negociacoes.v1'));
await browser.close();

console.log(resultados.join('\n'));
console.log(`\n${resultados.filter((r) => r.startsWith('PASS')).length}/${resultados.length} passaram`);
if (erros.length) {
  console.log('\nErros de console:');
  erros.forEach((e) => console.log(`  ${e}`));
}
process.exit(resultados.some((r) => r.startsWith('FALHA')) || erros.length ? 1 : 0);
