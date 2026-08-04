/**
 * Captura a tela da Focus AI rodando no dev server.
 *
 *   npm run dev                                    # em outro terminal
 *   npm run shot                                   # / no viewport desktop
 *   npm run shot -- /leads --out leads.png         # outra rota
 *   npm run shot -- --mobile                       # viewport estreito
 *   npm run shot -- --perfil advogado@focus.ai     # captura sob outro papel
 *   npm run shot -- /login --out login.png         # a porta de entrada
 *
 * Desde que a aplicação exige sessão (`ACC-R08`), o script entra antes de
 * capturar. `--perfil` passou a receber e-mail, porque papel agora se troca
 * entrando com outra conta — não há mais seletor.
 *
 * As imagens caem em .screenshots/ (fora do versionamento).
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { entrar, CONTA_PADRAO, BASE } from './entrar.mjs';

const args = process.argv.slice(2);
const flag = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`);
  return i === -1 ? padrao : args[i + 1];
};

const rota = args.find((a) => a.startsWith('/')) ?? '/';
const mobile = args.includes('--mobile');
const perfil = flag('perfil', null);
const baseUrl = BASE;
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

const caminho = rota.replace(/^\/#?/, '/');
const alvo = `${baseUrl}/#${caminho}`;

// A tela de login é a única que existe sem sessão — capturá-la logado só
// devolveria o painel, porque ela redireciona quem já entrou.
if (caminho === '/login') {
  await page.goto(alvo, { waitUntil: 'networkidle', timeout: 30_000 });
} else {
  await entrar(page, perfil ?? CONTA_PADRAO, baseUrl);
  await page.goto(alvo, { waitUntil: 'networkidle', timeout: 30_000 });
}

// Espera o shell montar de verdade — não basta o HTML chegar.
await page.waitForSelector('#root > *', { timeout: 15_000 });
// Navegar só pelo hash não dispara carregamento: dá o quadro para a view trocar.
await page.waitForTimeout(300);

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
