// Cria a conta de acesso (login + perfil) — o único ponto onde um `perfis`
// nasce sem já existir um `auth.users` correspondente.
//
// Não dá para fazer isso de uma função no banco: criar linha em `auth.users`
// exige a Admin API, que só existe com a chave de serviço, e chave de serviço
// não roda em função chamável direto pelo cliente sem reimplementar o
// isolamento à mão (`API-R03`). Por isso função de borda — a autoridade do
// ator ainda é conferida contra o token dele antes de qualquer escrita.
//
// `INV-12` — contas nunca são autocriadas: o corpo da requisição não tem
// espaço para "sou eu mesmo que estou me cadastrando". Quem chama precisa já
// ter uma linha em `perfis`, e o que ela pode criar depende do papel dela
// (`ACC-R02`, espelhado de `PODE_CRIAR` em `src/lib/usuarios.ts`).
//
// `ACC-R22` — a conta nasce sempre em `convite_pendente`. `inviteUserByEmail`
// cria o login e dispara o e-mail de convite nativo do Supabase — mas o painel
// ainda não tem um provedor de SMTP configurado, então a entrega desse e-mail
// depende do limite baixo do remetente de teste embutido. Continua sendo a
// pendência "convite não sai de verdade": a conta nasce de verdade agora, a
// entrega do e-mail é outra frente.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CABECALHOS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function responder(corpo: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CABECALHOS_CORS, 'Content-Type': 'application/json' },
  });
}

/** Mesma regra de `iniciais()` em src/lib/usuarios.ts. */
function iniciais(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((p) => !['de', 'da', 'do', 'das', 'dos', 'e'].includes(p.toLowerCase()));
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** ACC-R02 — mesma tabela de src/lib/usuarios.ts (PODE_CRIAR). */
const PODE_CRIAR: Record<string, string[]> = {
  adm: ['gerente', 'gestor_trafego', 'criativo', 'analista_conformidade', 'operador_ia', 'cs', 'financeiro', 'adm'],
  gerente: ['gestor_trafego', 'criativo', 'analista_conformidade', 'operador_ia', 'cs', 'financeiro'],
  gestor_trafego: ['criativo'],
};

const PAPEIS_INTERNOS = new Set([
  'adm', 'gerente', 'gestor_trafego', 'criativo', 'analista_conformidade', 'operador_ia', 'cs', 'financeiro',
]);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS_CORS });
  if (req.method !== 'POST') return responder({ ok: false, motivo: 'Método não suportado.' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  const cabecalhoAuth = req.headers.get('Authorization');
  if (!cabecalhoAuth) return responder({ ok: false, motivo: 'Sessão ausente.' }, 401);

  try {
    // Cliente com o token de quem chamou, só para confirmar quem é.
    const clienteDoAtor = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: cabecalhoAuth } },
    });
    const { data: sessao } = await clienteDoAtor.auth.getUser();
    if (!sessao?.user) return responder({ ok: false, motivo: 'Sessão inválida.' }, 401);

    // Dali em diante, privilégio de serviço — e a responsabilidade de não
    // vazar isolamento entre advogados é toda desta função (API-R03).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: atorPerfil } = await admin
      .from('perfis')
      .select('papel')
      .eq('id', sessao.user.id)
      .maybeSingle();
    if (!atorPerfil) return responder({ ok: false, motivo: 'Sessão sem perfil.' }, 403);

    const corpo = await req.json();
    const nome = String(corpo.nome ?? '').trim();
    const email = String(corpo.email ?? '').trim().toLowerCase();
    const papel = String(corpo.role ?? '');
    const departamento = corpo.departamento ? String(corpo.departamento).trim() : null;
    const permissoes = Array.isArray(corpo.permissoes) ? corpo.permissoes : [];
    // Presente só quando a conta nasce da liberação de acesso do funil
    // (ADV-R09) — nunca escolhido livremente pelo formulário genérico.
    const paraAdvogadoId = corpo.paraAdvogadoId ? String(corpo.paraAdvogadoId) : null;

    if (paraAdvogadoId) {
      const { data: permissaoAtor } = await admin
        .from('perfis')
        .select('permissoes')
        .eq('id', sessao.user.id)
        .maybeSingle();
      if (!permissaoAtor?.permissoes?.includes('advogado:liberar_acesso')) {
        return responder({ ok: false, motivo: 'Sem permissão para liberar acesso de advogado.' }, 403);
      }
    } else {
      if (papel === 'advogado') {
        return responder(
          { ok: false, motivo: 'Conta de advogado só nasce da liberação de acesso no funil (INV-12).' },
          403,
        );
      }
      const permitidos = PODE_CRIAR[atorPerfil.papel] ?? [];
      if (!permitidos.includes(papel)) {
        return responder({ ok: false, motivo: `Seu papel não pode criar contas de ${papel}.` }, 403);
      }
    }

    if (!nome || nome.split(/\s+/).length < 2) {
      return responder({ ok: false, motivo: 'Informe nome e sobrenome — as iniciais do avatar saem daqui.' }, 400);
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return responder({ ok: false, motivo: 'E-mail inválido.' }, 400);
    }
    if (PAPEIS_INTERNOS.has(papel) && !departamento) {
      return responder({ ok: false, motivo: 'Departamento é obrigatório para papéis internos.' }, 400);
    }

    const { data: existente } = await admin
      .from('perfis')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    if (existente) {
      return responder({ ok: false, motivo: 'Já existe uma conta com este e-mail, ativa ou desativada.' }, 409);
    }

    const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email);
    if (erroConvite || !convite?.user) {
      return responder({ ok: false, motivo: erroConvite?.message ?? 'Falha ao criar a conta de acesso.' }, 400);
    }

    const { error: erroPerfil } = await admin.from('perfis').insert({
      id: convite.user.id,
      nome,
      email,
      papel,
      departamento,
      permissoes,
      advogado_id: paraAdvogadoId,
      avatar_iniciais: iniciais(nome),
      status: 'convite_pendente',
      criado_por: sessao.user.id,
    });

    if (erroPerfil) {
      // Sem perfil, o login fica órfão — desfaz para não deixar rastro sem dono.
      await admin.auth.admin.deleteUser(convite.user.id);
      return responder({ ok: false, motivo: erroPerfil.message }, 400);
    }

    return responder({ ok: true, id: convite.user.id });
  } catch (e) {
    return responder({ ok: false, motivo: String((e as Error)?.message ?? e) }, 500);
  }
});
