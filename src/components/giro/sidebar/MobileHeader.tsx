'use client';

import { useState } from 'react';
import { Menu, X, BarChart3, Building2, LogOut } from 'lucide-react';
import NavLinks from './NavLinks';
import FilialSelect from './FilialSelect';
import { GiroFilial } from '@/types/giro';
import { cn } from '@/lib/utils';
import { logout } from '@/app/login/actions';

interface Props {
  filiais:     GiroFilial[];
  filialAtual: string;
  labelAtual:  string;
  simuladorReforma?: boolean;
}

export default function MobileHeader({ filiais, filialAtual, labelAtual, simuladorReforma = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="md:hidden flex items-center gap-3 border-b bg-white px-4 h-14 shrink-0 z-30">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="h-5 w-5 text-primary shrink-0" />
          <span className="font-semibold text-base leading-none">Giro 360°</span>
          <span className="ml-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px]">
            {labelAtual}
          </span>
        </div>
      </header>

      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-white md:hidden',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-base leading-none">Giro 360°</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Seletor de filial no drawer */}
        {filiais.length > 0 && (
          <div onClick={() => setOpen(false)}>
            <FilialSelect filiais={filiais} filialAtual={filialAtual} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-3" onClick={() => setOpen(false)}>
          <NavLinks simuladorReforma={simuladorReforma} />
        </div>

        <div className="border-t px-4 py-3">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
