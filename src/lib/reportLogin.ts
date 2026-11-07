import 'server-only';

// Reporta login de operador pro giro360_backend, só pra aparecer na tela de
// Logs de Acesso do admin (ver GET /tunnel-logs). Best-effort: nunca deve
// travar/atrasar o login do usuário se o VPS estiver fora do ar.
const VPS_URL = (process.env.VPS_URL || 'http://localhost:3001').replace(/\/$/, '');

export async function reportarLoginLocal(cnpj: string, usuarioCodigo?: number, usuarioNome?: string, deviceId?: string) {
  if (!cnpj) return;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    await fetch(`${VPS_URL}/log-login?cnpj=${encodeURIComponent(cnpj)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Key': process.env.APP_TOKEN_KEY || '' },
      body: JSON.stringify({
        aplicacao: 'giro_web',
        usuario_codigo: usuarioCodigo ?? null,
        usuario_nome: usuarioNome ?? '',
        device_id: deviceId ?? '',
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
  } catch {
    // silencioso -- log de auditoria não pode derrubar o login
  }
}
