/**
 * Login para os scripts de verificação.
 *
 * Desde que a aplicação passou a exigir sessão (`ACC-R08`), nenhum script
 * alcança tela nenhuma sem entrar antes. Trocar de papel também deixou de ser
 * um clique no seletor: agora é sair e entrar de novo, com round-trip de rede
 * no meio — por isso as esperas são por seletor, nunca por tempo fixo.
 *
 * As senhas vêm de `.secrets/supabase.env`, que não é versionado.
 */
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.secrets/supabase.env', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

export const CONTA_PADRAO = 'victorpaulodev@focus.ai';

/** Cada conta de administrador tem senha própria; as de teste dividem a mesma. */
export function senhaDe(email) {
  const alvo = email.trim().toLowerCase();
  if (alvo === CONTA_PADRAO) return env.SUPABASE_SENHA_ADMIN;
  if (env.FOCUS_ADM_EMAIL && alvo === env.FOCUS_ADM_EMAIL.trim().toLowerCase()) {
    return env.FOCUS_ADM_SENHA;
  }
  return env.SUPABASE_SENHA_TESTE;
}

/**
 * Entra e espera a moldura da aplicação montar. Assume que a página já está no
 * dev server; navega para `/login` se ainda não estiver lá.
 */
export async function entrar(page, email, base = 'http://localhost:5173') {
  await page.goto(`${base}/#/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#login-email');
  await page.fill('#login-email', email);
  await page.fill('#login-senha', senhaDe(email));
  await page.click('button[type="submit"]');

  // A barra superior só existe com sessão — é o sinal de que o portão abriu.
  await page.waitForSelector('button[aria-label="Menu do usuário"]', { timeout: 20_000 });
}

/** Sai e entra como outra pessoa. É a única forma de trocar de papel. */
export async function entrarComo(page, email, base = 'http://localhost:5173') {
  const jaLogado = await page.locator('button[aria-label="Menu do usuário"]').count();
  if (jaLogado) {
    await page.click('button[aria-label="Menu do usuário"]');
    await page.click('[role="menu"] button:has-text("Sair")');
    await page.waitForSelector('#login-email', { timeout: 20_000 });
  }
  await entrar(page, email, base);
}
