// Fetch client-side — chamado diretamente do browser para o backend do cliente.
// URL e token JWT vêm da sessão ativa no localStorage (expira em 8h).

import { getSessaoAtiva } from './empresas';
import { qs } from './utils';

export { qs };

export async function apiFetchClient<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const sessao = getSessaoAtiva();
  if (!sessao) throw new Error('Sessão expirada. Faça login novamente.');

  const url = `${sessao.backend_url}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': sessao.token,   // já tem o prefixo "Bearer "
      'X-Device-Id':   sessao.device_id,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`Backend ${res.status} em ${init?.method ?? 'GET'} ${url}: ${body}`);
  }

  return res.json() as Promise<T>;
}
