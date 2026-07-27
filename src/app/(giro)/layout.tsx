import { cookies } from 'next/headers';
import NavLinks from '@/components/giro/sidebar/NavLinks';
import MobileHeader from '@/components/giro/sidebar/MobileHeader';
import FilialSelect from '@/components/giro/sidebar/FilialSelect';
import SidebarShell from '@/components/giro/sidebar/SidebarShell';
import BackendGate from '@/components/giro/BackendGate';
import LogoutButton from '@/components/giro/sidebar/LogoutButton';
import { BarChart3 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { GiroFilial, GiroFiliaisResponse } from '@/types/giro';

async function getFiliais(): Promise<GiroFilial[]> {
  try {
    const data = await apiFetch<GiroFiliaisResponse>('/api/giro/filiais');
    return data.filiais ?? [];
  } catch {
    return [];
  }
}

export default async function GiroLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const filiais     = await getFiliais();

  let nomeUsuario = '';
  try {
    const userCookie = cookieStore.get('giro_user')?.value;
    if (userCookie) nomeUsuario = JSON.parse(userCookie).nome ?? '';
  } catch { /* ignora */ }

  const defaultFilial = filiais.length > 0 ? String(filiais[0].codigo) : '1';
  const filialAtual   = cookieStore.get('giro_filial')?.value ?? defaultFilial;

  const labelAtual = filialAtual === '0'
    ? 'Consolidado'
    : (filiais.find((f) => String(f.codigo) === filialAtual)?.fantasia?.trim()
       || filiais.find((f) => String(f.codigo) === filialAtual)?.empresa?.trim()
       || `Filial ${filialAtual}`);

  const brand = (
    <>
      <BarChart3 className="h-5 w-5 text-primary shrink-0" />
      <span className="font-semibold text-sm leading-none">Giro 360°</span>
    </>
  );

  const filialNode = filiais.length > 0
    ? <FilialSelect filiais={filiais} filialAtual={filialAtual} />
    : null;

  const footer = (
    <div className="border-t px-4 py-3 space-y-2">
      {nomeUsuario && (
        <p className="text-xs font-medium text-foreground truncate" title={nomeUsuario}>
          {nomeUsuario}
        </p>
      )}
      <p className="text-xs text-muted-foreground">Logidoc · {new Date().getFullYear()}</p>
      <LogoutButton />
    </div>
  );

  return (
    // BackendGate: bloqueia na tela de CNPJ se localStorage não tiver a URL do backend.
    // Após configurado, todas as chamadas de API vão browser → backend direto (sem VPS).
    <BackendGate>
      <div className="flex h-screen overflow-hidden">

        {/* ── Sidebar (desktop) com toggle ──────────────────────────────── */}
        <SidebarShell
          brand={brand}
          filial={filialNode}
          nav={<NavLinks />}
          footer={footer}
        />

        {/* ── Área de conteúdo ──────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <MobileHeader filiais={filiais} filialAtual={filialAtual} labelAtual={labelAtual} />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>

      </div>
    </BackendGate>
  );
}
