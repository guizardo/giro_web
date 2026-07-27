'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input }  from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label }  from '@/components/ui/label';
import { BarChart3, AlertCircle, Loader2, RefreshCw, CheckCircle2, Mail, Clock } from 'lucide-react';
import { fmtCnpj, salvarEmpresa } from '@/lib/empresas';

const VPS = process.env.NEXT_PUBLIC_VPS_URL || 'http://localhost:3001';
const POLL_INTERVAL_MS = 5000;

type Tela = 'form' | 'enviando' | 'aguardando';

export default function RegistroPage() {
  const router = useRouter();

  const [tela, setTela]           = useState<Tela>('form');
  const [cnpj, setCnpj]           = useState('');
  const [codigo, setCodigo]       = useState('');
  const [senha, setSenha]         = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaSvg, setCaptchaSvg]     = useState('');
  const [captchaSecret, setCaptchaSecret] = useState('');
  const [erro, setErro]           = useState('');
  const [mensagemEmail, setMensagemEmail] = useState('');
  const [temEmail, setTemEmail]   = useState(true);
  const [carregandoCaptcha, setCarregandoCaptcha] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [deviceId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('giro_device_id');
    if (!id) {
      // crypto.randomUUID() requer HTTPS; getRandomValues funciona em HTTP também
      id = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
            (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)
          );
      localStorage.setItem('giro_device_id', id);
    }
    return id;
  });

  const buscarCaptcha = useCallback(async () => {
    setCarregandoCaptcha(true);
    setCaptchaInput('');
    try {
      const r = await fetch(`${VPS}/giro/captcha`);
      const d = await r.json();
      setCaptchaSvg(d.svg);
      setCaptchaSecret(d.secret);
    } catch {
      setErro('Não foi possível carregar o captcha. Verifique a conexão.');
    } finally {
      setCarregandoCaptcha(false);
    }
  }, []);

  useEffect(() => { buscarCaptcha(); }, [buscarCaptcha]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setTela('enviando');

    try {
      const r = await fetch(`${VPS}/giro/registro-empresa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj:      cnpj.replace(/\D/g, ''),
          codigo:    Number(codigo),
          senha,
          captcha:   captchaInput,
          secret:    captchaSecret,
          device_id: deviceId,
        }),
      });
      const d = await r.json();

      if (!r.ok) {
        setErro(d.erro || 'Erro ao registrar.');
        setTela('form');
        if (r.status === 400 && d.erro?.includes('aptcha')) buscarCaptcha();
        return;
      }

      setMensagemEmail(d.message);
      setTemEmail(d.tem_email !== false);
      setTela('aguardando');
    } catch {
      setErro('Erro de conexão com o servidor.');
      setTela('form');
    }
  }

  // Polling: consulta status da aprovação a cada 5s enquanto aguarda
  useEffect(() => {
    if (tela !== 'aguardando') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    async function checarStatus() {
      try {
        const cnpjNumeros = cnpj.replace(/\D/g, '');
        const r = await fetch(`${VPS}/giro/status/${deviceId}?cnpj=${cnpjNumeros}`);
        if (!r.ok) return;
        const d = await r.json();
        if (d.status === 'aprovado' && d.config) {
          if (pollRef.current) clearInterval(pollRef.current);
          salvarEmpresa(d.config);
          router.push('/login');
        } else if (d.status === 'bloqueado') {
          if (pollRef.current) clearInterval(pollRef.current);
          setErro('Acesso bloqueado pelo administrador.');
          setTela('form');
        }
      } catch {
        // silencia erros de rede — tenta de novo no próximo tick
      }
    }

    checarStatus(); // primeira verificação imediata
    pollRef.current = setInterval(checarStatus, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [tela, cnpj, deviceId, router]);

  // Detecta confirmação via link de email em outro tab (storage event)
  useEffect(() => {
    if (tela !== 'aguardando') return;
    function onStorage(e: StorageEvent) {
      if (e.key === 'giro_empresas_v1' && e.newValue && e.newValue !== '[]') {
        router.push('/login');
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [tela, router]);

  // ── Aguardando confirmação ───────────────────────────────────
  if (tela === 'aguardando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-gray-100 p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${temEmail ? 'bg-green-50' : 'bg-amber-50'}`}>
              {temEmail
                ? <Mail className="h-8 w-8 text-green-600" />
                : <Clock className="h-8 w-8 text-amber-600" />
              }
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900">
            {temEmail ? 'Verifique seu email' : 'Aguardando aprovação'}
          </h2>

          <p className="text-sm text-gray-500">{mensagemEmail}</p>

          {temEmail ? (
            <div className="bg-blue-50 rounded-lg px-4 py-3 text-xs text-blue-700">
              Após clicar no link do email, você será redirecionado automaticamente.
            </div>
          ) : (
            <div className="bg-amber-50 rounded-lg px-4 py-3 text-xs text-amber-700">
              O administrador precisa aprovar seu acesso pelo portal.
              Esta página será atualizada automaticamente quando for liberado.
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verificando a cada 5 segundos...
          </div>

          <button
            onClick={() => router.push('/login')}
            className="text-xs text-indigo-600 hover:underline"
          >
            Já aprovado? Ir para o login
          </button>
        </div>
      </div>
    );
  }

  // ── Formulário ───────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-gray-100 p-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none text-gray-900">Giro 360°</h1>
            <p className="text-xs text-gray-400 mt-0.5">Registrar empresa neste dispositivo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-1.5">
            <Label htmlFor="cnpj">CNPJ da empresa</Label>
            <Input
              id="cnpj"
              type="text"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              value={fmtCnpj(cnpj)}
              onChange={e => setCnpj(e.target.value.replace(/\D/g, ''))}
              maxLength={18}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="codigo">Código do usuário</Label>
            <Input
              id="codigo"
              type="number"
              placeholder="ex: 1"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
            />
          </div>

          {/* Captcha */}
          <div className="space-y-2">
            <Label>Código de verificação</Label>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center"
                style={{ minHeight: 60 }}
                dangerouslySetInnerHTML={{ __html: captchaSvg }}
              />
              <button
                type="button"
                onClick={buscarCaptcha}
                disabled={carregandoCaptcha}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
                title="Gerar novo captcha"
              >
                <RefreshCw className={`h-4 w-4 ${carregandoCaptcha ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <Input
              type="text"
              placeholder="Digite os caracteres acima"
              value={captchaInput}
              onChange={e => setCaptchaInput(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          {/* ID do dispositivo */}
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <p className="text-xs text-gray-400 mb-0.5">ID do dispositivo</p>
            <code className="text-xs text-gray-500 font-mono break-all">{deviceId}</code>
          </div>

          {erro && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {erro}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={tela === 'enviando' || cnpj.length < 11 || !codigo || !senha || !captchaInput}
          >
            {tela === 'enviando' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</>
            ) : (
              'Registrar empresa'
            )}
          </Button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
          >
            Já tem empresa registrada? Fazer login
          </button>
        </div>
      </div>
    </div>
  );
}
