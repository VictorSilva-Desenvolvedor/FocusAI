import { readFileSync } from 'node:fs';

/**
 * Lê um arquivo no formato `.env` para um objeto.
 *
 * Terceiro uso do mesmo laço — `entrar.mjs`, `contas-de-teste.mjs` e agora
 * `banco-de-teste.mjs` —, que é quando vale extrair. Cada cópia tratava aspas e
 * comentários de um jeito ligeiramente diferente, e a que esquecia de recortar
 * o valor entregava senha com espaço no fim: login que falha sem dizer por quê.
 */
export function lerSegredos(caminho) {
  return Object.fromEntries(
    readFileSync(caminho, 'utf8')
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        const valor = l.slice(i + 1).trim();
        // Aspas são do shell, não do valor: senha entre aspas usada como senha
        // literal recusa o login e a mensagem não distingue isso de senha errada.
        const semAspas = valor.replace(/^(['"])(.*)\1$/, '$2');
        return [l.slice(0, i).trim(), semAspas];
      }),
  );
}

/** Aborta com uma lista do que falta, em vez de estourar na primeira chamada. */
export function exigir(env, chaves, arquivo) {
  const faltando = chaves.filter((c) => !env[c]);
  if (faltando.length === 0) return;
  console.error(`Falta preencher em ${arquivo}:`);
  for (const c of faltando) console.error(`  · ${c}`);
  process.exit(1);
}
