/**
 * Smoke test do catálogo de leads. Roda contra o dev server.
 *
 * O foco é o que os invariantes prometem, porque é isso que não pode quebrar em
 * silêncio: o telefone só aparece depois da compra (INV-11), um lead é vendido
 * uma única vez (INV-10), devolução repõe crédito sem recolocar no catálogo
 * (CRE-R05) e sem saldo o botão de comprar não é desenhado (CRE-R04).
 *
 * Precisa das contas de teste criadas (`npm run contas:teste`): desde `ACC-R08`
 * nenhuma tela abre sem sessão, e trocar de papel deixou de ser um clique — é
 * sair e entrar com outra conta. As três carteiras de advogado existem
 * justamente porque `LED-R06` não é demonstrável com uma só.
 */
import { chromium } from 'playwright';
import { entrar, entrarComo, BASE } from './entrar.mjs';

const URL = `${BASE}/#/leads`;
const ADM = 'victorpaulodev@focus.ai';
const resultados = [];
const ok = (n, cond, extra = '') =>
  resultados.push(`${cond ? 'PASS' : 'FALHA'}  ${n}${extra ? ` — ${extra}` : ''}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

const suspenso = (n, motivo) => resultados.push(`SUSPENSO  ${n} — ${motivo}`);

/**
 * Entrar como outra pessoa devolve ao painel: volta para a tela em teste.
 *
 * O `reload` fecha a mesma armadilha do início: `goto` para outro hash no mesmo
 * documento nem sempre renavega, e o teste acaba esperando um seletor na tela
 * anterior. Ele também garante que os contextos recarreguem sob a sessão nova —
 * que é o recorte que `LED-R06` manda conferir.
 */
const passarASer = async (email) => {
  await entrarComo(page, email);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
};

await entrar(page, ADM);
await page.goto(URL, { waitUntil: 'networkidle' });
/*
 * O `reload` não é supérfluo: com `HashRouter`, `goto` para outro hash no mesmo
 * documento nem sempre renavega, e `networkidle` resolve na hora porque não
 * houve rede.
 *
 * A limpeza de `localStorage` que existia aqui saiu junto com a migração — o
 * catálogo vem do banco agora, e apagar chave do navegador não muda mais nada.
 */
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('article');

// --- visão da operação -------------------------------------------------------
/*
 * Não dá para afirmar um número fixo de cartões, e a razão é o próprio teste:
 * ele compra e devolve um lead a cada execução, e devolvido vira `expirado`,
 * que é desfecho e sai do quadro. A segunda rodada encontra um cartão a menos
 * que a primeira — para sempre, porque `INV-13` e `INV-15` proíbem desfazer.
 *
 * Afirma-se então a relação, que sobrevive às próprias mutações: todo lead está
 * no quadro ou entre os encerrados, nunca nos dois nem em nenhum. O total é 17
 * porque lead não se apaga — ele muda de coluna.
 */
const totalCartoes = await page.locator('article').count();
const encerrados = Number(
  (await page.locator('button:has-text("Encerrados")').innerText()).match(/\d+/)?.[0] ?? 0,
);
ok(
  'quadro e encerrados cobrem os leads do banco',
  totalCartoes > 0 && totalCartoes + encerrados === 17,
  `${totalCartoes} no quadro + ${encerrados} encerrados`,
);

/*
 * LED-R01 — sem os filtros da tese confirmados, não publica no catálogo.
 *
 * Cleber Nascimento Duarte vem da seed do banco em `em_qualificacao` com só um
 * dos dois filtros de juros abusivos respondido — é o cartão que a tela mostra
 * como "1 filtro por confirmar".
 */
await page
  .locator('article', { hasText: 'Cleber Nascimento Duarte' })
  .first()
  .click({ button: 'right' });
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
await passarASer('advogado@focus.ai');
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

/*
 * INV-11 do lado que importa: o telefone só chega ao navegador depois que o
 * banco reconhece o comprador. Não é a tela que revela o número — é a política
 * de `leads_contato` que passa a casar a linha.
 */
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

/*
 * INV-10 visto do outro lado. Vale uma ressalva sobre o que este teste prova:
 * Gomes & Cia atua em SP/juros abusivos e o lead comprado é de GO, então ele
 * não estaria no catálogo dela de qualquer forma. O teste confirma que o lead
 * não aparece, mas não distingue "porque foi vendido" de "porque é de outra
 * região" — a prova forte de INV-10 é a recusa da segunda compra, que a função
 * do banco faz e este roteiro ainda não exercita.
 */
await page.waitForSelector('[role="status"]', { state: 'detached', timeout: 10_000 }).catch(() => {});
await passarASer('advogado2@focus.ai');
const textoOutro = await page.locator('main').innerText();
ok('outro advogado não vê o lead já vendido', !textoOutro.includes(nomeComprado));

// --- CRE-R04: sem saldo, o botão de comprar não é desenhado --------------------
await passarASer('advogado3@focus.ai');
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
await passarASer('advogado@focus.ai');
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
await page.waitForTimeout(800);

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
const voltouAoCatalogo =
  (await page.locator('button:has-text("Comprar")', { hasText: nomeComprado }).count()) > 0;
ok('lead devolvido NÃO volta ao catálogo', !voltouAoCatalogo);

// --- persistência: agora a escrita é do banco, então tem que sobreviver ---------
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.chip');
const saldoPosReload = Number(
  (await page.locator('.chip', { hasText: 'créditos no saldo' }).innerText()).match(/\d+/)?.[0] ?? 0,
);
ok('saldo sobrevive ao reload', saldoPosReload === saldoAposDevolucao, `${saldoPosReload}`);

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
