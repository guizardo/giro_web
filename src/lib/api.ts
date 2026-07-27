import 'server-only';
import { cookies } from 'next/headers';
import { getApiToken } from './apiToken';

const FALLBACK_BASE = process.env.BACKEND_URL!;

// Lê a URL da empresa do cookie de sessão e troca a credencial de transporte
// por um JWT de aplicação (cacheado em apiToken.ts) — não usa mais a senha
// pessoal do operador nem Basic Auth direto.
async function getServerBackend(): Promise<{ base: string; auth: string }> {
  let base = FALLBACK_BASE;
  let cnpj: string | undefined;
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get('giro_auth')?.value;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.backendUrl) base = parsed.backendUrl.replace(/\/$/, '');
      if (parsed.cnpj) cnpj = parsed.cnpj;
    }
  } catch { /* ignora */ }

  const token = await getApiToken(base, cnpj);
  return { base, auth: token };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { base, auth } = await getServerBackend();

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`Backend ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export const FILIAL = Number(process.env.FILIAL ?? 1);
