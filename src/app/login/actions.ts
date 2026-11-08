'use server';

import { cookies } from 'next/headers';
import { getApiToken } from '@/lib/apiToken';
import { reportarLoginLocal } from '@/lib/reportLogin';

export interface LoginResult {
  error?:     string;
  token?:     string;
  expira_em?: string;
  device_id?: string;
}

const VPS_URL = (process.env.VPS_URL || 'http://localhost:3001').replace(/\/$/, '');

interface EmpresaConfigFlags {
  pesquisaCodigoInterno: boolean;
  simuladorReforma:      boolean;
}

// Flags por empresa definidas no portal (tags pesquisa_codigo_interno e
// simulador_reforma). Consulta o VPS (/giro/empresa-config, e nao /resolve) a cada
// login, sem o cache do appToken. Envia X-App-Key como /giro/token.
// Falha ou ausencia = false. Nunca bloqueia o login.
async function consultaEmpresaConfig(cnpj: string): Promise<EmpresaConfigFlags> {
  const nenhuma: EmpresaConfigFlags = { pesquisaCodigoInterno: false, simuladorReforma: false };
  if (!cnpj) return nenhuma;
  try {
    const res = await fetch(
      `${VPS_URL}/giro/empresa-config?cnpj=${encodeURIComponent(cnpj)}`,
      { cache: 'no-store', headers: { 'X-App-Key': process.env.APP_TOKEN_KEY || '' }, signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return nenhuma;
    const data = (await res.json()) as { pesquisa_codigo_interno?: unknown; simulador_reforma?: unknown };
    return {
      pesquisaCodigoInterno: data.pesquisa_codigo_interno === true,
      simuladorReforma:      data.simulador_reforma === true,
    };
  } catch {
    return nenhuma;
  }
}

// Login em dois passos:
// 1) Login do sistema — valida código+senha pessoal contra a tabela SENHA
//    (POST /api/giro/auth/login, sem Basic Auth). Só identifica o operador
//    (sessão/cookie do giro_web); NÃO autoriza chamadas de API.
// 2) Token de aplicação — GET /api/auth/token com a credencial de transporte
//    (api_usuario/api_senha, distribuída pelo portal admin). Esse JWT é o que
//    autoriza as chamadas diretas do browser à API REST.
export async function login(
  _prev: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const backendUrl = ((formData.get('backend_url') as string) ?? '').trim();
  const cnpj       = ((formData.get('cnpj')        as string) ?? '').replace(/\D/g, '');
  const codigoRaw  = ((formData.get('codigo')      as string) ?? '').trim();
  const senha      = ((formData.get('senha')       as string) ?? '').trim();
  const device_id  = ((formData.get('device_id')   as string) ?? '').trim();

  if (!backendUrl || !codigoRaw || !senha) {
    return { error: 'Selecione uma empresa e preencha a senha.' };
  }

  const codigo = Number(codigoRaw);
  if (isNaN(codigo) || codigo <= 0) {
    return { error: 'Código inválido.' };
  }

  // Busca JWT antes do login pessoal — protege PostGiroLogin contra força bruta
  // (atacante externo não tem a credencial de transporte para obter o token).
  let appToken: string;
  try {
    appToken = await getApiToken(backendUrl, cnpj || undefined);
  } catch {
    return { error: 'Não foi possível conectar ao servidor da empresa.' };
  }

  const { pesquisaCodigoInterno, simuladorReforma } = await consultaEmpresaConfig(cnpj);

  // 1) Login do sistema — identifica o operador
  let data: { ok: boolean; erro?: string; token?: string; codigo?: number; nome?: string; tipo?: string };
  const loginUrl = `${backendUrl}/api/giro/auth/login`;
  try {
    console.log('[giro login] Tentativa de login', {
      url: loginUrl,
      cnpj,
      codigo,
      device_id,
    });

    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appToken}`,
      },
      body: JSON.stringify(
        pesquisaCodigoInterno
          ? { codigo, senha, device_id, pesquisa_codigo_interno: true }
          : { codigo, senha, device_id },
      ),
      cache: 'no-store',
    });

    const rawBody = await res.text();
    let parsedBody: unknown = rawBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      // mantém o corpo bruto quando a API não responde JSON
    }

    console.log('[giro login] Resposta da tentativa de login', {
      url: loginUrl,
      status: res.status,
      ok: res.ok,
      body: parsedBody,
    });

    if (res.status === 401 || res.status === 403) {
      return { error: 'Usuário ou senha incorretos.' };
    }

    data = typeof parsedBody === 'string'
      ? JSON.parse(parsedBody)
      : (parsedBody as { ok: boolean; erro?: string; token?: string; codigo?: number; nome?: string; tipo?: string });
  } catch (error) {
    console.error('[giro login] Falha na tentativa de login', {
      url: loginUrl,
      error,
    });
    return { error: 'Não foi possível conectar ao servidor da empresa.' };
  }

  if (!data.ok) {
    return { error: data.erro ?? 'Usuário ou senha incorretos.' };
  }

  // userJWT emitido pelo Delphi — contém device_id no claim, válido 8h.
  // Substitui o appToken genérico: token agora é pessoal + vinculado ao dispositivo.
  const userToken = data.token as string;
  if (!userToken) return { error: 'Servidor não emitiu token de sessão.' };

  await reportarLoginLocal(cnpj, data.codigo, data.nome, device_id);

  const expiraEm = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  const userInfo = JSON.stringify({
    codigo: data.codigo,
    nome:   data.nome,
    tipo:   data.tipo,
    backendUrl,
    cnpj,
    device_id,
    token:  userToken,
    simulador_reforma: simuladorReforma, // lido por lib/empresaFlags.ts
  });

  const cookieStore = cookies();
  cookieStore.set('giro_auth', userInfo, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8,
  });
  cookieStore.set('giro_user', JSON.stringify({ codigo: data.codigo, nome: data.nome, tipo: data.tipo }), {
    httpOnly: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8,
  });

  // Multiempresa: mesmo CNPJ/backend, várias empresas na mesma base (ver
  // GiroFilial.empresa). Nesse caso já entra com a visão consolidada
  // (filial=0) em vez da primeira filial.
  try {
    const filiaisRes = await fetch(`${backendUrl}/api/giro/filiais`, {
      headers: { Authorization: `Bearer ${userToken}` },
      cache: 'no-store',
    });
    if (filiaisRes.ok) {
      const filiaisData: { filiais?: { empresa?: string }[] } = await filiaisRes.json();
      const empresasDistintas = new Set(
        (filiaisData.filiais ?? []).map(f => (f.empresa ?? '').trim()).filter(Boolean),
      );
      if (empresasDistintas.size > 1) {
        cookieStore.set('giro_filial', '0', {
          httpOnly: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
        });
      }
    }
  } catch {
    // não bloqueia o login se a checagem de multiempresa falhar
  }

  return { token: userToken, expira_em: expiraEm, device_id };
}

export async function logout() {
  const cookieStore = cookies();
  cookieStore.delete('giro_auth');
  cookieStore.delete('giro_user');
  cookieStore.delete('giro_filial');
}
