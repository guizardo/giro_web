'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getEmpresas, getSessaoAtiva } from '@/lib/empresas';

interface Props { children: React.ReactNode }

export default function BackendGate({ children }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (getEmpresas().length === 0) {
      // Nenhuma empresa registrada neste dispositivo → tela de cadastro
      router.replace('/registro');
      return;
    }

    // Sessão expira em 8h (token JWT) — sem token valido, volta pro login
    // (mesmo se o cookie httpOnly ainda existir; o token client-side é exigido
    // pelas chamadas diretas ao Delphi via apiFetchClient).
    if (!getSessaoAtiva()) {
      router.replace('/login');
      return;
    }

    setOk(true);
  }, [router, pathname]);

  if (!ok) return null;
  return <>{children}</>;
}
