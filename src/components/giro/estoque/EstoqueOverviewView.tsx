'use client';

import Link from 'next/link';
import { GiroOverview, CURVA_GIRO } from '@/types/giro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, Zap, AlertTriangle, ArrowRight } from 'lucide-react';

interface Props { data: GiroOverview; filialLabel?: string; }

export default function EstoqueOverviewView({ data, filialLabel }: Props) {
  const total = (data.total_produtos ?? 0) || 1;

  const curvas = [
    { key: 'a', count: data.curva_a ?? 0, ...CURVA_GIRO['A'] },
    { key: 'b', count: data.curva_b ?? 0, ...CURVA_GIRO['B'] },
    { key: 'c', count: data.curva_c ?? 0, ...CURVA_GIRO['C'] },
    { key: 'd', count: data.curva_d ?? 0, ...CURVA_GIRO['D'] },
    { key: 'e', count: data.curva_e ?? 0, ...CURVA_GIRO['E'] },
  ];

  const pct = (n: number) => ((n / total) * 100).toFixed(1) + '%';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visão Geral de Giro</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {filialLabel ?? `Filial ${data.filial}`} · {(data.total_produtos ?? 0).toLocaleString('pt-BR')} produtos analisados
        </p>
      </div>

      {/* Curva cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {curvas.map(({ key, count, label, color }) => (
          <Card key={key}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Curva {key.toUpperCase()} — {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold">{count.toLocaleString('pt-BR')}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-semibold ${color}`}>
                  {pct(count)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Barra de proporção */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Distribuição por Curva</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex h-6 rounded-full overflow-hidden gap-0.5">
            {[
              { pct: data.curva_a / total, cls: 'bg-green-400' },
              { pct: data.curva_b / total, cls: 'bg-blue-400' },
              { pct: data.curva_c / total, cls: 'bg-yellow-400' },
              { pct: data.curva_d / total, cls: 'bg-orange-400' },
              { pct: data.curva_e / total, cls: 'bg-red-400' },
            ].map((seg, i) => (
              <div
                key={i}
                className={seg.cls}
                style={{ flex: seg.pct || 0.001 }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {curvas.map(({ key, label, color }) => (
              <span key={key} className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${color}`}>
                <span className="font-semibold">{key.toUpperCase()}</span> {label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Links rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            href: '/estoque/parados',
            icon: TrendingDown,
            title: 'Produtos Parados',
            desc: 'Itens com giro < 20% nos últimos 30 dias',
            count: data.curva_d + data.curva_e,
            danger: true,
          },
          {
            href: '/estoque/ruptura',
            icon: Zap,
            title: 'Risco de Ruptura',
            desc: 'Alto giro com cobertura crítica ou estoque abaixo do mínimo',
            count: data.curva_a + data.curva_b,
            danger: false,
          },
          {
            href: '/estoque/perda',
            icon: AlertTriangle,
            title: 'Perda Desconhecida',
            desc: 'Divergências de inventário sem causa conhecida',
            count: null,
            danger: true,
          },
        ].map(({ href, icon: Icon, title, desc, count, danger }) => (
          <Link key={href} href={href} className="group block">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${danger ? 'bg-red-50' : 'bg-blue-50'}`}>
                    <Icon className={`h-5 w-5 ${danger ? 'text-red-500' : 'text-blue-500'}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                {count !== null && (
                  <p className="text-2xl font-bold">
                    {count.toLocaleString('pt-BR')}
                    <span className="text-sm font-normal text-muted-foreground ml-1">produtos</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
