/**
 * Smoke test do catálogo de leads. Roda contra o dev server.
 *
 * O foco é o que os invariantes prometem, porque é isso que não pode quebrar em
 * silêncio: o telefone só aparece depois da compra (INV-11), um lead é vendido
 * uma única vez (INV-10), devolução repõe crédito sem recolocar no catálogo
 * (CRE-R05) e sem saldo o botão de comprar não é desenhado (CRE-R04).
 */
import { chromium } from 'playwright';

const URL = 'http://localhost:5173/#/leads';
const resultados = [];
const ok = (n, cond, extra = '') =>
  resultados.push(`${cond ? 'PASS' : 'FALHA'}  ${n}${extra ? ` — ${extra}` : ''}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

const limpar = () =>
  page.evaluate(() => {
    localStorage.removeItem('focus.leads.v1');
    localStorage.removeItem('focus.advogados.v1');
    localStorage.removeItem('focus.creditos.v1');
  });

const trocarPerfil = async (id) => {
  await page.click('button[aria-label="Trocar perfil de demonstração"]');
  await page.click(`[data-perfil="${id}"]`);
  await page.waitForTimeout(400);
};

await page.goto(URL, { waitUntil: 'networkidle' });
await limpar();
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('article');

// --- visão da operação -------------------------------------------------------
const totalCartoes = await page.locator('article').count();
ok('quadro carrega os leads', totalCartoes > 15, `${totalCartoes} cartões`);

// LED-R01 — sem os filtros da tese confirmados, não publica no catálogo.
await page.locator('article', { hasText: 'Eliane Prado Moura' }).first().click({ button: 'right' });
await page.waitForSelector('[role="menu"]');
const itemAgendado = page.locator('[role="menu"] button', { hasText: 'Agendado' });
ok(
  'menu marca publicação bloqueada por elegibilidade',
  /bloqueado/.test(await itemAgendado.innerText()),
);
await itemAgendado.click();
await page.waitForTimeout(300);
const avisoElegibilidade = await page.locator('[role="status"]').innerText().catch(() => '');
ok(
  'publicar lead inelegível é recusado com o motivo',
  /não publica no catálogo/i.test(avisoElegibilidade),
  avisoElegibilidade.trim().slice(0, 80),
);
await page.waitForTimeout(7200);

// --- o advogado: catálogo mascarado -------------------------------------------
await trocarPerfil('u-advogado');
await page.waitForSelector('button:has-text("Comprar")');

/*
 * INV-11 — a checagem é por cartão do catálogo, não pela página inteira: os
 * leads já comprados ficam na mesma tela e mostram o telefone completo por
 * direito. Varrer `main` misturaria os dois e o teste passaria a acusar o
 * comportamento correto.
 */
const cartoesAVenda = await page.locator('button:has-text("Comprar")').allInnerTexts();
ok(
  'todo cartão do catálogo mostra contato mascarado',
  cartoesAVenda.length > 0 && cartoesAVenda.every((t) => /••••/.test(t)),
);
ok(
  'nenhum cartão do catálogo expõe telefone completo',
  cartoesAVenda.every((t) => !/\(\d{2}\)\s*9\d{4}-\d{4}/.test(t)),
);

const textoCatalogo = await page.locator('main').innerText();
const cartoesCatalogo = cartoesAVenda.length;
ok('advogado vê o catálogo das próprias teses', cartoesCatalogo > 0, `${cartoesCatalogo} à venda`);

// LED-R06 — o recorte é por tese e região. Prev Fácil atua em GO.
const temForaDaRegiao = /Campinas|Niterói|Uberlândia/.test(textoCatalogo);
ok('catálogo não traz lead de fora da região do advogado', !temForaDaRegiao);

// --- compra --------------------------------------------------------------------
const saldoAntes = Number(
  (await page.locator('.chip', { hasText: 'créditos no saldo' }).innerText()).match(/\d+/)?.[0] ?? 0,
);

await page.locator('button:has-text("Comprar")').first().click();
await page.waitForSelector('[role="dialog"]');
const nomeComprado = (await page.locator('[role="dialog"] h2').innerText()).trim();
await page.locator('[role="dialog"] button:has-text("Comprar lead")').click();
await page.waitForTimeout(500);

const avisoCompra = await page.locator('[role="status"]').innerText().catch(() => '');
ok('comprar libera o contato', /telefone completo já está liberado/i.test(avisoCompra), avisoCompra.trim());

const textoDrawer = await page.locator('[role="dialog"]').innerText();
ok('telefone completo aparece depois da compra', /\(\d{2}\) 9\d{4}-\d{4}/.test(textoDrawer));

await page.keyboard.press('Escape');
await page.waitForTimeout(300);

const saldoDepois = Number(
  (await page.locator('.chip', { hasText: 'créditos no saldo' }).innerText()).match(/\d+/)?.[0] ?? 0,
);
ok(
  'compra debita crédito no mesmo passo',
  saldoDepois < saldoAntes,
  `${saldoAntes} → ${saldoDepois}`,
);

// INV-10 — vendido some do catálogo e não volta.
await page.waitForTimeout(300);
const catalogoDepois = await page.locator('button:has-text("Comprar")').count();
ok('lead comprado sai do catálogo', catalogoDepois === cartoesCatalogo - 1);

const secaoMeus = await page.locator('main').innerText();
ok('lead comprado aparece em "Seus leads"', secaoMeus.includes(nomeComprado));

// --- INV-10 visto do outro lado: outro advogado não enxerga o lead vendido -----
// O toast da compra cita o nome do lead e vive dentro do <main> por alguns
// segundos. Sem esperar ele sair, a varredura de texto acusa a si mesma.
await page.waitForSelector('[role="status"]', { state: 'detached', timeout: 10_000 }).catch(() => {});
await trocarPerfil('u-advogado-2');
const textoOutro = await page.locator('main').innerText();
ok('outro advogado não vê o lead já vendido', !textoOutro.includes(nomeComprado));

// --- CRE-R04: sem saldo, o botão de comprar não é desenhado --------------------
await trocarPerfil('u-advogado-3');
const semSaldoTexto = await page.locator('main').innerText();
const disponiveisSemSaldo = Number(
  (await page.locator('.chip', { hasText: 'disponíveis para você' }).innerText()).match(
    /\d+/,
  )?.[0] ?? 0,
);
ok(
  'advogado sem saldo ainda enxerga o catálogo',
  disponiveisSemSaldo > 0,
  `${disponiveisSemSaldo} disponíveis`,
);
ok('mas nenhum botão de comprar é desenhado', !/Comprar/.test(semSaldoTexto));
ok(
  'e a razão aparece no lugar do botão',
  /Saldo insuficiente/.test(semSaldoTexto),
  semSaldoTexto.match(/Saldo insuficiente[^\n]*/)?.[0],
);

// --- devolução ------------------------------------------------------------------
await trocarPerfil('u-advogado');
await page.waitForTimeout(400);
const saldoAntesDevolucao = Number(
  (await page.locator('.chip', { hasText: 'créditos no saldo' }).innerText()).match(/\d+/)?.[0] ?? 0,
);

await page.locator('button', { hasText: nomeComprado }).first().click();
await page.waitForSelector('[role="dialog"]');
await page.locator('[role="dialog"] button:has-text("Devolver")').click();
await page.waitForTimeout(200);

const botaoConfirmar = page.locator('[role="dialog"] button:has-text("Confirmar devolução")');
ok('devolver exige motivo antes de confirmar', await botaoConfirmar.isDisabled());

await page.locator('[role="dialog"] select#motivo-devolucao').selectOption({ index: 1 });
await page.waitForTimeout(150);
ok('motivo escolhido libera a devolução', !(await botaoConfirmar.isDisabled()));
await botaoConfirmar.click();
await page.waitForTimeout(500);

const avisoDevolucao = await page.locator('[role="status"]').innerText().catch(() => '');
ok(
  'devolução avisa que o lead não volta ao catálogo',
  /não volta ao catálogo/i.test(avisoDevolucao),
  avisoDevolucao.trim(),
);

const saldoAposDevolucao = Number(
  (await page.locator('.chip', { hasText: 'créditos no saldo' }).innerText()).match(/\d+/)?.[0] ?? 0,
);
ok(
  'devolução repõe o crédito',
  saldoAposDevolucao > saldoAntesDevolucao,
  `${saldoAntesDevolucao} → ${saldoAposDevolucao}`,
);

// CRE-R05 — o crédito volta, o lead não: o contato já foi exposto.
await page.waitForTimeout(300);
const catalogoFinal = await page.locator('main').innerText();
const voltouAoCatalogo =
  catalogoFinal.includes(nomeComprado) &&
  (await page.locator('button:has-text("Comprar")', { hasText: nomeComprado }).count()) > 0;
ok('lead devolvido NÃO volta ao catálogo', !voltouAoCatalogo);

// --- persistência ------------------------------------------------------------------
await page.reload({ waitUntil: 'networkidle' });
// O perfil ativo não sobrevive ao reload: o seletor é demonstração, não login.
// Sem reescolher, a página volta como administrador e os chips do advogado não
// existem — que foi exatamente como este teste falhou da primeira vez.
await trocarPerfil('u-advogado');
const saldoPosReload = Number(
  (await page.locator('.chip', { hasText: 'créditos no saldo' }).innerText()).match(/\d+/)?.[0] ?? 0,
);
ok('saldo sobrevive ao reload', saldoPosReload === saldoAposDevolucao, `${saldoPosReload}`);

// --- limpeza -------------------------------------------------------------------------
await limpar();
await browser.close();

console.log(resultados.join('\n'));
console.log(`\n${resultados.filter((r) => r.startsWith('PASS')).length}/${resultados.length} passaram`);
if (erros.length) {
  console.log('\nErros de console:');
  erros.forEach((e) => console.log(`  ${e}`));
}
process.exit(resultados.some((r) => r.startsWith('FALHA')) || erros.length ? 1 : 0);
