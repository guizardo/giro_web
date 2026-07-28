import 'server-only';

// Obtém JWT de aplicação do Delphi via VPS proxy.
// O VPS tem as credenciais por empresa (tunnel_portas.api_usuario/api_senha) —
// o giro_web não precisa conhecê-las, evitando variáveis de ambiente por cliente.

const VPS_URL = (process.env.VPS_URL || 'http://localhost:3001').replace(/\/$/, '');

interface CachedToken { token: string; expiraEm: number }
const cache = new Map<string, CachedToken>();

export async function getApiToken(backendUrl: string, cnpj?: string): Promise<string> {
  const cacheKey = (cnpj || backendUrl).replace(/\/$/, '');
  const cached = cache.get(cacheKey);
  if (cached && cached.expiraEm > Date.now() + 60_000) {
    console.log('[giro token] Token em cache', {
      vpsUrl: VPS_URL,
      backendUrl,
      cnpj,
      cacheKey,
    });
    return cached.token;
  }

  const qs = cnpj
    ? `cnpj=${encodeURIComponent(cnpj)}`
    : `backend_url=${encodeURIComponent(backendUrl.replace(/\/$/, ''))}`;

  const tokenUrl = `${VPS_URL}/giro/token?${qs}`;

  console.log('[giro token] Solicitando token', {
    url: tokenUrl,
    backendUrl,
    cnpj,
    cacheKey,
  });

  const res = await fetch(tokenUrl, {
    cache: 'no-store',
    headers: { 'X-App-Key': process.env.APP_TOKEN_KEY || '' },
  });

  const rawBody = await res.text();
  let parsedBody: unknown = rawBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    // mantém o corpo bruto quando a API não responde JSON
  }

  console.log('[giro token] Resposta do token', {
    url: tokenUrl,
    status: res.status,
    ok: res.ok,
    body: parsedBody,
  });

  if (!res.ok) {
    const body = typeof parsedBody === 'string'
      ? {}
      : (parsedBody as { erro?: string });
    throw new Error(body.erro || `HTTP ${res.status}`);
  }

  const data = typeof parsedBody === 'string'
    ? JSON.parse(parsedBody)
    : (parsedBody as { token?: string; erro?: string });
  if (!data.token) throw new Error(data.erro || 'Token vazio na resposta.');

  // Token do Delphi dura 8h — cacheia por 7h
  cache.set(cacheKey, { token: data.token, expiraEm: Date.now() + 7 * 60 * 60 * 1000 });
  return data.token;
}
