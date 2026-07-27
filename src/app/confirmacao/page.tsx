'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { salvarEmpresa } from '@/lib/empresas';

function ConfirmacaoConteudo() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'salvando' | 'ok' | 'erro'>('salvando');
  const [msg, setMsg]       = useState('');

  useEffect(() => {
    const cnpj        = searchParams.get('cnpj')        ?? '';
    const codigoStr   = searchParams.get('codigo')      ?? '';
    const backend_url = searchParams.get('backend_url') ?? '';
    const device_id   = searchParams.get('device_id')   ?? '';
    const salvo_em    = searchParams.get('salvo_em')    ?? new Date().toISOString();

    if (!cnpj || !codigoStr || !backend_url || !device_id) {
      setStatus('erro');
      setMsg('Link inválido ou incompleto.');
      return;
    }

    try {
      salvarEmpresa({ cnpj, codigo: Number(codigoStr), backend_url, device_id, salvo_em });
      setStatus('ok');
      setTimeout(() => router.push('/login'), 1800);
    } catch {
      setStatus('erro');
      setMsg('Não foi possível salvar a configuração. Tente novamente.');
    }
  }, [searchParams, router]);

  if (status === 'salvando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border p-10 text-center space-y-4">
          <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Salvando configuração...</p>
        </div>
      </div>
    );
  }

  if (status === 'erro') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-red-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border p-10 text-center space-y-4">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Erro na confirmação</h2>
          <p className="text-sm text-gray-500">{msg}</p>
          <button onClick={() => router.push('/registro')} className="text-sm text-indigo-600 hover:underline">
            Voltar ao registro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border p-10 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Acesso confirmado!</h2>
        <p className="text-sm text-gray-500">Dispositivo autorizado. Redirecionando para o login...</p>
      </div>
    </div>
  );
}

export default function ConfirmacaoPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
      </div>
    }>
      <ConfirmacaoConteudo />
    </Suspense>
  );
}
