/**
 * Smoke test do módulo de usuários. Roda contra o dev server.
 *
 * Precisa das contas de teste criadas (`npm run contas:teste`): desde `ACC-R08`
 * nenhuma tela abre sem sessão, e trocar de papel deixou de ser um clique — é
 * sair e entrar com outra conta.
 */
import { chromium } from 'playwright';
import { entrar, entrarComo, BASE } from './entrar.mjs';

const URL = `${BASE}/#/config/usuarios`;
const ADM = 'victorpaulodev@focus.ai';
const resultados = [];
const ok = (n, cond, extra = '') =>
  resultados.push(`${cond ? 'PASS' : 'FALHA'}  ${n}${extra ? ` — ${extra}` : ''}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

/** Entrar como outra pessoa devolve ao painel: volta para a tela em teste. */
const passarASer = async (email) => {
  await entrarComo(page, email);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('table');
};

await entrar(page, ADM);
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.removeItem('focus.usuarios.v1'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('table');

const totalInicial = await page.locator('tbody tr').count();
// 12 contas do time + as 3 de advogado, que aparecem na lista mas são
// gerenciadas no funil, não aqui (INV-12).
ok('lista carrega com as contas semeadas', totalInicial === 15, `${totalInicial} linhas`);

// --- validação -------------------------------------------------------------
await page.click('text=Novo usuário');
await page.waitForSelector('[role="dialog"]');
await page.click('button:has-text("Cadastrar usuário")');
const errosVazio = await page.locator('[role="dialog"] p.campo-mensagem-erro').count();
ok('submeter vazio acusa os 3 campos obrigatórios', errosVazio === 3, `${errosVazio} erros`);

await page.fill('[role="dialog"] input#\\:r1\\:-nome, [role="dialog"] input[placeholder="Ana Ribeiro"]', 'Ana');
await page.waitForTimeout(200);
 const erroNome = await page.locator('[role="dialog"] p.campo-mensagem-erro').first().textContent();
ok('nome sem sobrenome é recusado', /sobrenome/i.test(erroNome ?? ''), erroNome?.trim());

await page.fill('[role="dialog"] input[placeholder="Ana Ribeiro"]', 'Ana Ribeiro');
await page.fill('[role="dialog"] input[type="email"]', ADM);
await page.waitForTimeout(150);
const textoErros = await page.locator('[role="dialog"]').innerText();
ok('e-mail duplicado é recusado', /Já existe uma conta com este e-mail/.test(textoErros));

// --- criação ---------------------------------------------------------------
await page.fill('[role="dialog"] input[type="email"]', 'ana.ribeiro@focus.ai');
await page.selectOption('[role="dialog"] select', 'gestor_trafego');
await page.waitForTimeout(200);

const permsMarcadas = await page.locator('[role="dialog"] input[type="checkbox"]:checked').count();
ok('escolher papel aplica as permissões padrão', permsMarcadas === 2, `${permsMarcadas} marcadas`);

const previa = await page.locator('[role="dialog"]').innerText();
ok('prévia de acesso lista os módulos do papel', /O que esta conta enxerga/.test(previa));

await page.fill('[role="dialog"] input[list]', 'Tráfego');
await page.click('button:has-text("Cadastrar usuário")');
await page.waitForTimeout(400);

const fechou = (await page.locator('[role="dialog"]').count()) === 0;
ok('drawer fecha após cadastrar', fechou);

const toast = await page.locator('[role="status"]').textContent().catch(() => '');
ok('toast confirma o cadastro', /cadastrado/i.test(toast ?? ''), toast?.trim());

const totalDepois = await page.locator('tbody tr').count();
ok('nova conta entra na lista', totalDepois === totalInicial + 1, `${totalDepois} linhas`);

const linhaAna = page.locator('tbody tr', { hasText: 'ana.ribeiro@focus.ai' });
const statusAna = await linhaAna.innerText();
ok('conta nasce como convite pendente', /Convite pendente/.test(statusAna));

// --- persistência ----------------------------------------------------------
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('table');
const totalPosReload = await page.locator('tbody tr').count();
ok('cadastro sobrevive ao reload', totalPosReload === totalInicial + 1, `${totalPosReload} linhas`);

// --- ACC-R03: ninguém edita a si mesmo -------------------------------------
const linhaEu = page.locator('tbody tr', { hasText: ADM });
const editarEu = linhaEu.locator('button[aria-label^="Editar"]');
ok('botão de editar a própria conta fica desabilitado', await editarEu.isDisabled());

// --- hierarquia de criação --------------------------------------------------
await passarASer('gestortrafego@focus.ai');
await page.click('text=Novo usuário');
await page.waitForSelector('[role="dialog"]');
const opcoes = await page.locator('[role="dialog"] select option').allTextContents();
ok(
  'gestor de tráfego só pode criar criativo',
  opcoes.length === 2 && opcoes[1] === 'Criativo',
  opcoes.join(', '),
);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

const linhaGerente = page.locator('tbody tr', { hasText: 'gerente@focus.ai' });
ok(
  'gestor não gerencia conta de gerente',
  await linhaGerente.locator('button[aria-label^="Editar"]').isDisabled(),
);

// --- último administrador ---------------------------------------------------
await passarASer(ADM);
const desativarEu = linhaEu.locator('button[aria-label^="Desativar"]');
ok('botão de desativar a própria conta fica desabilitado', await desativarEu.isDisabled());

// --- desativação ------------------------------------------------------------
const linhaTiago = page.locator('tbody tr', { hasText: 'operadoria@focus.ai' });
await linhaTiago.locator('button[aria-label^="Desativar"]').click();
await page.waitForSelector('[role="alertdialog"]');
ok('desativar pede confirmação', true);
await page.click('button:has-text("Desativar"):below([role="alertdialog"] h2)').catch(async () => {
  await page.locator('[role="alertdialog"] button:has-text("Desativar")').click();
});
await page.waitForTimeout(400);
const textoTiago = await linhaTiago.innerText();
ok('conta fica inativa e permanece na base', /Inativo/.test(textoTiago));

// --- filtros ----------------------------------------------------------------
// Esperar a lista reagir, não dormir um tempo fixo: o sleep passava por sorte
// e falhava quando a máquina estava mais carregada.
await page.fill('input[aria-label="Buscar usuários"]', 'conformidade');
await page
  .waitForFunction(() => document.querySelectorAll('tbody tr').length < 5, null, { timeout: 5000 })
  .catch(() => {});
const filtrados = await page.locator('tbody tr').count();
ok('busca filtra por departamento', filtrados === 1, `${filtrados} linhas`);

await page.fill('input[aria-label="Buscar usuários"]', 'zzzznaoexiste');
const vazio = await page
  .waitForSelector('text=Nenhum usuário com esses filtros', { timeout: 5000 })
  .then(() => 1)
  .catch(() => 0);
ok('estado vazio aparece quando o filtro não retorna nada', vazio === 1);

// --- limpeza ----------------------------------------------------------------
await page.evaluate(() => localStorage.removeItem('focus.usuarios.v1'));
await browser.close();

console.log(resultados.join('\n'));
console.log(`\n${resultados.filter((r) => r.startsWith('PASS')).length}/${resultados.length} passaram`);
if (erros.length) {
  console.log('\nErros de console:');
  erros.forEach((e) => console.log(`  ${e}`));
}
process.exit(resultados.some((r) => r.startsWith('FALHA')) || erros.length ? 1 : 0);
