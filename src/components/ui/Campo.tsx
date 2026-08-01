import type { ReactNode } from 'react';

/**
 * Casca de campo de formulário: rótulo, controle e a linha de baixo, que é
 * erro **ou** dica, nunca as duas.
 *
 * A mensagem de erro sai sempre por `.campo-mensagem-erro`. É de propósito:
 * essa classe é o gancho que os smoke tests usam para achar erro de validação,
 * então trocá-la quebra o teste — e o teste passa a apontar exatamente o lugar
 * único onde a mensagem de erro é estilizada.
 */
export function Campo({
  id,
  rotulo,
  erro,
  dica,
  children,
}: {
  id: string;
  rotulo: string;
  erro?: string;
  dica?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="campo-rotulo">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p className="campo-mensagem-erro">{erro}</p>
      ) : dica ? (
        <p className="campo-dica">{dica}</p>
      ) : null}
    </div>
  );
}

/** Classe do controle, com a variante inválida quando há erro. */
export function entrada(erro?: string): string {
  return erro ? 'campo campo-invalido' : 'campo';
}
