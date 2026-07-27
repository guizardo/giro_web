/**
 * GET /debug — diagnóstico de sessão e backend.
 * Remover em produção ou proteger com variável de ambiente.
 */
import { cookies } from 'next/headers';

const BASE           = process.env.BACKEND_URL ?? '';
const TRANSPORT_AUTH = 'Basic ' + Buffer.from(
  `${process.env.BACKEND_USER}:${process.env.BACKEND_PASS}`,
).toString('base64');

async function testBackend(url: string): Promise<{ status: number | string; ok: boolean; body: string }> {
  try {
    const res  = await fetch(url, {
      headers: { Authorization: TRANSPORT_AUTH, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const body = await res.text().catch(() => '');
    return { status: res.status, ok: res.ok, body: body.substring(0, 400) };
  } catch (err: unknown) {
    return { status: String(err), ok: false, body: '' };
  }
}

export default async function DebugPage() {
  const cookieStore = cookies();
  const tlsReject   = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

  const giroAuth   = cookieStore.get('giro_auth')?.value;
  const giroUser   = cookieStore.get('giro_user')?.value;
  const giroFilial = cookieStore.get('giro_filial')?.value;

  let parsedUser: Record<string, unknown> = {};
  try { parsedUser = JSON.parse(giroAuth ?? '{}'); } catch { /* */ }

  const testUrl    = BASE ? `${BASE}/api/giro/filiais` : '';
  const testResult = testUrl ? await testBackend(testUrl) : null;

  const row = (label: string, value: string, ok?: boolean) => (
    <tr key={label} className="border-b last:border-0">
      <td className="py-2 pr-6 font-mono text-xs text-gray-500 whitespace-nowrap align-top">{label}</td>
      <td className={`py-2 font-mono text-xs break-all ${ok === false ? 'text-red-600' : ok === true ? 'text-green-700' : ''}`}>
        {value}
      </td>
    </tr>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-xl font-bold">Diagnóstico — Giro 360°</h1>
        <p className="text-sm text-gray-500 mt-1">Exclusivo para desenvolvimento.</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">Sessão do usuário</h2>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <tbody>
              {row('giro_auth cookie', giroAuth ? '✅ presente (httpOnly)' : '❌ ausente — não logado', !!giroAuth)}
              {giroAuth && row('codigo', String(parsedUser.codigo ?? '?'))}
              {giroAuth && row('nome',   String(parsedUser.nome   ?? '?'))}
              {giroAuth && row('tipo',   String(parsedUser.tipo   ?? '?'))}
              {row('giro_filial', giroFilial ?? '(não definido — usa env FILIAL)')}
              {row('giro_user (display)', giroUser ?? '(vazio)')}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">Variáveis de ambiente</h2>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <tbody>
              {row('BACKEND_URL',  BASE     || '❌ não definido', !!BASE)}
              {row('BACKEND_USER', process.env.BACKEND_USER ? '✅ definido' : '❌ não definido', !!process.env.BACKEND_USER)}
              {row('BACKEND_PASS', process.env.BACKEND_PASS ? '✅ definido' : '❌ não definido', !!process.env.BACKEND_PASS)}
              {row('FILIAL',       process.env.FILIAL ?? '(não definido)')}
              {row('TLS_REJECT_UNAUTHORIZED', tlsReject === '0'
                ? '0 — verificação desabilitada (IP privado detectado)'
                : `${tlsReject ?? 'não definido'} — SSL habilitado`)}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Teste de conexão — <span className="font-normal font-mono">{testUrl || '(BACKEND_URL não definido)'}</span>
        </h2>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <tbody>
              {testResult ? (
                <>
                  {row('HTTP status', String(testResult.status), testResult.ok)}
                  {row('Auth usado',  TRANSPORT_AUTH.substring(0, 16) + '...')}
                  {row('Resposta',    testResult.body || '(vazio)')}
                </>
              ) : row('Status', '⚠️ BACKEND_URL não configurado', false)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">Como interpretar:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li><strong>HTTP 200</strong> → backend acessível, credenciais de transporte (env) corretas</li>
          <li><strong>HTTP 401</strong> → BACKEND_USER/BACKEND_PASS incorretos no .env.local</li>
          <li><strong>Erro de conexão</strong> → BACKEND_URL incorreto ou backend offline</li>
          <li>TLS=0 → certificado auto-assinado/expirado ignorado para IP privado</li>
          <li>Logs detalhados no terminal do <code>npm run dev</code></li>
        </ul>
      </section>
    </div>
  );
}
