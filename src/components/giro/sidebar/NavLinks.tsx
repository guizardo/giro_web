'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Package, TrendingDown, Zap, AlertTriangle, CalendarSearch, Building2, Link2, Calculator, Store } from 'lucide-react';

const links = [
  { href: '/estoque',                   label: 'Visão Geral',      icon: Package },
  { href: '/estoque/parados',           label: 'Parados',          icon: TrendingDown },
  { href: '/estoque/ruptura',           label: 'Ruptura',          icon: Zap },
  { href: '/estoque/ruptura-fornecedor', label: 'Ruptura p/ Fornecedor', icon: Building2 },
  { href: '/estoque/perda',             label: 'Perda Desc.',      icon: AlertTriangle },
  { href: '/estoque/perda-periodo',     label: 'Perda p/ Período', icon: CalendarSearch },
  { href: '/estoque/correlacao',        label: 'Correlação',       icon: Link2 },
];

// Telas do Simulador da Reforma — so aparecem quando a empresa tem a opcao
// habilitada no portal admin (empresas.simulador_reforma).
const linksReforma = [
  { href: '/estoque/simulador-cbs',        label: 'Simulador CBS 2027',      icon: Calculator },
  { href: '/estoque/fornecedores-simples', label: 'Fornecedores do Simples', icon: Store },
];

export default function NavLinks({ simuladorReforma = false }: { simuladorReforma?: boolean }) {
  const pathname = usePathname();
  const itens = simuladorReforma ? [...links, ...linksReforma] : links;

  return (
    <nav className="flex flex-col gap-1 px-3">
      {itens.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/estoque' && pathname.startsWith(href + '/'));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
