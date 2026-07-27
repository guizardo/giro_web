'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { login } from './actions';
import { Input }  from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label }  from '@/components/ui/label';
import { BarChart3, AlertCircle, Loader2, X, Building2, Plus } from 'lucide-react';
import { getEmpresas, setSessaoAtiva, removerEmpresa, fmtCnpj, type EmpresaConfig } from '@/lib/empresas';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [empresas, setEmpresas]     = useState<EmpresaConfig[]>([]);
  const [selecionada, setSelecionada] = useState<EmpresaConfig | null>(null);
  const [senha, setSenha]           = useState('');
  const [error, setError]           = useState('');
  const [isPending, startTransition] = useTransition();

  // Carrega empresas do localStorage (client-only)
  useEffect(() => {
    const lista = getEmpresas();
    setEmpresas(lista);
    if (lista.length === 1) setSelecionada(lista[0]);
  }, []);

  function handleRemover(e: React.MouseEvent, emp: EmpresaConfig) {
    e.stopPropagation();
    removerEmpresa(emp.cnpj, emp.codigo);
    const nova = getEmpresas();
    setEmpresas(nova);
    if (selecionada?.cnpj === emp.cnpj && selecionada?.codigo === emp.codigo) {
      setSelecionada(nova.length === 1 ? nova[0] : null);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selecionada) { setError('Selecione uma empresa.'); return; }
    setError('');
    const formData = new FormData(e.currentTarget);
    formData.set('backend_url', selecionada.backend_url);
    formData.set('cnpj',        selecionada.cnpj);
    formData.set('codigo',      String(selecionada.codigo));
    formData.set('device_id',   selecionada.device_id);

    startTransition(async () => {
      const result = await login({}, formData);
      if (result?.error || !result?.token) {
        setError(result?.error ?? 'Erro ao entrar.');
        return;
      }
      setSessaoAtiva({
        cnpj:        selecionada.cnpj,
        codigo:      selecionada.codigo,
        nome:        selecionada.nome,
        backend_url: selecionada.backend_url,
        device_id:   result.device_id ?? selecionada.device_id,
        token:       `Bearer ${result.token}`,
        expira_em:   result.expira_em!,
      });
      router.push('/');
    });
  }

  // ── Sem empresas: redireciona para registro ─────────────────
  if (empresas.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow">
              <BarChart3 className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-xl font-bold">Giro 360°</h1>
          <p className="text-sm text-muted-foreground">Nenhuma empresa registrada neste dispositivo.</p>
          <Button className="w-full" onClick={() => router.push('/registro')}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar empresa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-5">

        {/* Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow">
            <BarChart3 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Giro 360°</h1>
          <p className="text-sm text-muted-foreground">Selecione a empresa e faça login</p>
        </div>

        {/* Lista de empresas */}
        <div className="space-y-2">
          {empresas.map(emp => (
            <button
              key={`${emp.cnpj}-${emp.codigo}`}
              type="button"
              onClick={() => { setSelecionada(emp); setSenha(''); setError(''); }}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                selecionada?.cnpj === emp.cnpj && selecionada?.codigo === emp.codigo
                  ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {emp.nome || `Cód. ${emp.codigo}`}
                </p>
                <p className="text-xs text-gray-400">{fmtCnpj(emp.cnpj)}</p>
              </div>
              <button
                type="button"
                onClick={ev => handleRemover(ev, emp)}
                className="ml-1 p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                title="Remover empresa"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </button>
          ))}
        </div>

        {/* Formulário de senha */}
        {selecionada && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="backend_url" value={selecionada.backend_url} />
              <input type="hidden" name="codigo"      value={selecionada.codigo} />

              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  name="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isPending || !senha}>
                {isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Link discreto para registrar nova empresa */}
        <div className="text-center">
          <button
            onClick={() => router.push('/registro')}
            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Adicionar outra empresa
          </button>
        </div>

      </div>
    </div>
  );
}
