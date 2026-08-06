import { useMemo } from 'react';
import { ArrowRight, Coins, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAdvogados } from '@/src/contexts/AdvogadosContext';
import { useCreditos } from '@/src/contexts/CreditosContext';
import { MODELO_PAGAMENTO_LABEL } from '@/types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Não é comissão nem bônus — a Focus AI não paga o advogado, ele paga a Focus
 * AI por lead (`CRE-R01` a `CRE-R07`). "Meu Dinheiro" aqui é o que já existe
 * de verdade: quanto ele gastou e qual o saldo, com o extrato completo a um
 * clique — não uma cópia da tela de Créditos.
 */
export function MeuDinheiroView() {
  const { perfil, ehAdvogado, advogadoId } = useAuth();
  const { advogados } = useAdvogados();
  const { movimentos } = useCreditos();
  const navegar = useNavigate();
  const proprios = useMemo(
    () => movimentos.filter((m) => m.advogadoId === advogadoId),
    [movimentos, advogadoId],
  );

  if (!ehAdvogado) {
    return (
      <div className="card p-10 text-center">
        <div className="size-11 mx-auto rounded-xl bg-stone-100 grid place-items-center mb-3">
          <Wallet className="size-5 text-stone-400" />
        </div>
        <p className="text-[14px] font-medium text-roxo-900">Não há dado financeiro pessoal aqui</p>
        <p className="subtitulo-pagina mt-1.5 max-w-md mx-auto">
          O sistema não paga comissão nem bônus a ninguém — o advogado paga por lead. Receita da
          operação fica no módulo Créditos.
        </p>
      </div>
    );
  }

  const advogado = advogados.find((a) => a.id === advogadoId) ?? null;
  const totalGasto = proprios.reduce((soma, m) => soma + (m.valor > 0 ? m.valor : 0), 0);

  if (!advogado) {
    return (
      <div className="card py-16 text-center">
        <p className="text-[14px] font-medium text-roxo-900">Acesso ainda não vinculado</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <div className="label-eyebrow mb-1.5">Modelo</div>
          <div className="text-xl font-semibold text-roxo-900">
            {advogado.modeloPagamento ? MODELO_PAGAMENTO_LABEL[advogado.modeloPagamento] : '—'}
          </div>
          {advogado.modeloPagamento === 'creditos' && (
            <p className="nota mt-1">saldo de {advogado.saldoCreditos} créditos</p>
          )}
        </div>
        <div className="card p-5">
          <div className="label-eyebrow mb-1.5 flex items-center gap-1.5">
            <Coins className="size-3.5" />
            Total gasto
          </div>
          <div className="text-xl font-semibold text-roxo-900 tabular">{brl.format(totalGasto)}</div>
          <p className="nota mt-1">{proprios.length} movimentos no extrato</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navegar('/creditos')}
        className="btn btn-secundario w-full justify-between"
      >
        Ver extrato completo em Créditos
        <ArrowRight className="size-4" />
      </button>

      <p className="nota mt-3">
        {perfil.nome}, este resumo é o mesmo dado do módulo Créditos — não um saldo separado.
      </p>
    </div>
  );
}
