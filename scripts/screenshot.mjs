/**
 * Captura a tela da Focus AI rodando no dev server.
 *
 *   npm run dev                                # em outro terminal
 *   npm run shot                               # / no viewport desktop
 *   npm run shot -- /leads --out leads.png     # outra rota
 *   npm run shot -- --mobile                   # viewport estreito
 *   npm run shot -- --perfil u-advogado        # troca o papel ativo
 *
 * As imagens caem em .screenshots/ (fora do versionamento).
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`);
  return i === -1 ? padrao : args[i + 1];
};

const rota = args.find((a) => a.startsWith('/')) ?? '/';
const mobile = args.includes('--mobile');
const perfil = flag('perfil', null);
const baseUrl = flag('url', 'http://localhost:5173');
const saida = path.resolve('.screenshots', flag('out', mobile ? 'mobile.png' : 'desktop.png'));

const largura = Number(flag('largura', mobile ? 420 : 1440));
const ALTURA_MAX = 4000;

await mkdir(path.dirname(saida), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: largura, height: 1000 },
  deviceScaleFactor: 2,
});

const erros = [];
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
page.on('pageerror', (e) => erros.push(String(e)));

const alvo = `${baseUrl}/#${rota.replace(/^\/#?/, '/')}`;
await page.goto(alvo, { waitUntil: 'networkidle', timeout: 30_000 });

// Espera o shell montar de verdade — não basta o HTML chegar.
await page.waitForSelector('#root > *', { timeout: 15_000 });

if (perfil) {
  await page.selectOption('select[aria-label="Trocar perfil de demonstração"]', perfil);
  await page.waitForTimeout(150);
}

// --click aceita seletor CSS ou texto ("text=Novo usuário"), repetível.
for (const seletor of args.reduce(
  (acc, a, i) => (a === '--click' ? [...acc, args[i + 1]] : acc),
  [],
)) {
  await page.click(seletor, { timeout: 10_000 });
  await page.waitForTimeout(250);
}

/*
 * O shell é h-screen com overflow-hidden e o scroll vive dentro do <main>, então
 * `fullPage: true` sozinho corta tudo abaixo da dobra. Medimos a altura real do
 * conteúdo e crescemos o viewport até ela antes de capturar.
 */
const alturaConteudo = await page.evaluate(() => {
  // Sobreposição aberta (drawer, modal) é posicionada em relação ao viewport:
  // crescer a altura só afastaria o conteúdo. Nesses casos mantém o viewport.
  if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return window.innerHeight;
  const main = document.querySelector('main');
  if (!main) return document.body.scrollHeight;
  return main.scrollHeight + (window.innerHeight - main.clientHeight);
});
await page.setViewportSize({
  width: largura,
  height: Math.min(Math.ceil(alturaConteudo), ALTURA_MAX),
});
await page.waitForTimeout(200);

await page.screenshot({ path: saida });
await browser.close();

const rel = path.relative(process.cwd(), saida);
console.log(`✓ ${alvo}${perfil ? ` [${perfil}]` : ''} → ${rel} (${largura}×${Math.ceil(alturaConteudo)})`);
if (erros.length) {
  console.error(`\n✗ ${erros.length} erro(s) no console:`);
  for (const e of erros) console.error(`  ${e}`);
  process.exit(1);
}
console.log('✓ console limpo');
