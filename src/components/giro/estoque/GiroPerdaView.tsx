'use client';

import { useRouter } from 'next/navigation';
import { GiroPerdaItem, CURVA_GIRO } from '@/types/giro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useState, useCallback, useEffect, useRef } from 'react';
import { qs } from '@/lib/utils';
import { useGiroInfiniteList } from '@/hooks/useGiroInfiniteList';
import { GiroPerdaTotais } from '@/types/giro';
import { ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, X, Loader2, Info, Download, Search } from 'lucide-react';
import GiroProdutoDetalheModal from './GiroProdutoDetalheModal';
import { downloadXlsx } from '@/lib/exportXlsx';

type SortKey = keyof Pick<GiroPerdaItem,
  'cod_pro' | 'produto' | 'secao' | 'grupo' | 'curva' |
  'giro_30d' | 'perda_30d' | 'perda_12m' | 'valor_perda_30d' | 'valor_perda_12m' |
  'venda_7d' | 'venda_30d' | 'venda_90d' | 'venda_12m' | 'perc_perda'
>;
type SortDir = 'asc' | 'desc';

interface Props {
  filialAtual:  string;
  secaoAtual:   string;
  grupoAtual:   string;
  curvaAtual:   string;
  codigoAtual:  string;
  dataIniAtual: string;
  dataFimAtual: string;
}

const emptyTotais: GiroPerdaTotais = {
  produtos_perda: 0, perda_30d_un: 0, perda_12m_un: 0,
  valor_perda_30d: 0, valor_perda_12m: 0,
  perda_critica: 0, perda_alta: 0, perc_perda_desc: 0,
};

const PAGE_SIZE = 500;

function GiroPerc({ value }: { value: number }) {
  const color =
    value === 0 ? 'text-red-600' :
    value < 10  ? 'text-orange-500' :
    value < 20  ? 'text-yellow-600' : 'text-foreground';
  return <span className={`font-mono text-xs ${color}`}>{value.toFixed(1)}%</span>;
}

function CurvaBadge({ curva }: { curva: string }) {
  const meta = CURVA_GIRO[curva] ?? { label: curva, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${meta.color}`}>
      {curva} · {meta.label}
    </span>
  );
}

function NivelBadge({ perc }: { perc: number }) {
  const { label, cls } =
    perc >= 10 ? { label: 'CRÍTICO',  cls: 'bg-red-100 text-red-700 border-red-200' } :
    perc >= 5  ? { label: 'ALTO',     cls: 'bg-orange-100 text-orange-700 border-orange-200' } :
    perc >= 2  ? { label: 'MODERADO', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' } :
                 { label: 'BAIXO',    cls: 'bg-green-100 text-green-700 border-green-200' };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="inline h-3 w-3 ml-1 text-muted-foreground/50" />;
  return sortDir === 'asc'
    ? <ChevronUp className="inline h-3 w-3 ml-1" />
    : <ChevronDown className="inline h-3 w-3 ml-1" />;
}

function Th({ children, col, sortKey, sortDir, onSort, className = '', rowSpan }: {
  children: React.ReactNode; col: SortKey; sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void; className?: string; rowSpan?: number;
}) {
  return (
    <th
      rowSpan={rowSpan}
      className={`cursor-pointer select-none hover:bg-muted/60 whitespace-nowrap text-left font-medium ${className}`}
      onClick={() => onSort(col)}
    >
      {children}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );
}

function ThGroup({ children, colSpan, className = '' }: { children: React.ReactNode; colSpan: number; className?: string }) {
  return (
    <th
      colSpan={colSpan}
      className={`py-0.5 px-2 text-center text-[9px] font-semibold tracking-wide border-b whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

export default function GiroPerdaView({
  filialAtual, secaoAtual, grupoAtual, curvaAtual, codigoAtual,
  dataIniAtual, dataFimAtual,
}: Props) {
  const router = useRouter();
  const buscaInputRef = useRef<HTMLInputElement>(null);
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const aplicarBusca = () => setBuscaAplicada((buscaInputRef.current?.value ?? '').trim());
  const limparBusca = () => {
    if (buscaInputRef.current) buscaInputRef.current.value = '';
    setBuscaAplicada('');
  };
  const [sortKey,     setSortKey]     = useState<SortKey>('perda_12m');
  const [sortDir,     setSortDir]     = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [detalheSelecionado, setDetalheSelecionado] = useState<{ idDadospro: number; produto: string } | null>(null);

  const hasFilters = !!(secaoAtual || grupoAtual || curvaAtual || codigoAtual || dataIniAtual || dataFimAtual);

  const buildPath = useCallback((offset: number) => `/api/giro/perda${qs({
    filial:    filialAtual,
    limit:     PAGE_SIZE,
    offset,
    order_by:  sortKey,
    order_dir: sortDir,
    secao:     secaoAtual   || undefined,
    grupo:     grupoAtual   || undefined,
    curva:     curvaAtual   || undefined,
    codigo:    codigoAtual  || undefined,
    busca:     buscaAplicada || undefined,
    data_ini:  dataIniAtual || undefined,
    data_fim:  dataFimAtual || undefined,
  })}`, [filialAtual, sortKey, sortDir, secaoAtual, grupoAtual, curvaAtual, codigoAtual, buscaAplicada, dataIniAtual, dataFimAtual]);

  const resetKey = [filialAtual, secaoAtual, grupoAtual, curvaAtual, codigoAtual, buscaAplicada, dataIniAtual, dataFimAtual, sortKey, sortDir].join('|');

  const { items, totais, loading, loadingMore, error, hasMore, scrollRef, sentinelRef, loadMore } =
    useGiroInfiniteList<GiroPerdaItem, GiroPerdaTotais>({ buildPath, pageSize: PAGE_SIZE, resetKey });

  const [exportando, setExportando] = useState(false);

  const filial = filialAtual;

  const navigate = (params: Record<string, string>) => {
    router.push(`/estoque/perda${qs({
      secao: secaoAtual, grupo: grupoAtual, curva: curvaAtual,
      codigo: codigoAtual, data_ini: dataIniAtual, data_fim: dataFimAtual,
      ...params,
    })}`);
  };

  const fmt2 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir(['produto','secao','grupo','cod_pro','curva'].includes(key) ? 'asc' : 'desc');
    }
  };

  // Ordenação já vem do backend; aqui só filtramos localmente pelo texto de busca.
  const filtrados = items;

  useEffect(() => {
    if (!exportando || loading || loadingMore) return;
    if (hasMore) { loadMore(); return; }
    const headers = ['Código','Produto','Seção','Grupo','Curva','Giro 30d (%)','Perda 30d','Perda 12m','Valor Perda 30d','Valor Perda 12m','Venda 7d','Venda 30d','Venda 90d','Venda 12m','Dias Oport. 30d','Dias Oport. 365d','% Perda','Nível'];
    const rows = filtrados.map(d => [d.cod_pro, d.produto, d.secao, d.grupo, d.curva, d.giro_30d, d.perda_30d, d.perda_12m, d.valor_perda_30d, d.valor_perda_12m, d.venda_7d, d.venda_30d, d.venda_90d, d.venda_12m, d.dias_oportunidade_30d, d.dias_oportunidade_365d, d.perc_perda]);
    downloadXlsx(`perda_filial_${filialAtual}.xlsx`, headers, rows);
    setExportando(false);
  }, [exportando, hasMore, loading, loadingMore, filtrados, filialAtual, loadMore]);

  const t = totais ?? emptyTotais;
  const kpis = [
    { label: 'Produtos c/ perda', value: t.produtos_perda, color: 'text-orange-600' },
    { label: 'Perda 30d (un)',    value: t.perda_30d_un.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), color: 'text-red-500' },
    { label: 'Valor perda 30d',   value: `R$ ${fmt2(t.valor_perda_30d)}`, color: 'text-red-500' },
    { label: 'Perda 12m (un)',    value: t.perda_12m_un.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), color: 'text-red-600' },
    { label: 'Valor perda 12m',   value: `R$ ${fmt2(t.valor_perda_12m)}`, color: 'text-red-700' },
    { label: 'Perda crítica',     value: t.perda_critica,  color: 'text-red-700' },
    { label: 'Perda alta',        value: t.perda_alta,     color: 'text-orange-500' },
    { label: 'SKUs afetados',     value: t.produtos_perda, color: 'text-muted-foreground' },
  ];

  if (error) return (
    <div className="h-full flex items-center justify-center text-destructive text-sm p-8">{error}</div>
  );

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-xl font-bold tracking-tight">Perda Desconhecida</h1>
        <p className="text-muted-foreground text-sm">
          {loading ? 'Carregando...' : `${filtrados.length} de ${t.produtos_perda} produtos`}
          {' · '}{filial === '0' ? 'Consolidado' : `Filial ${filial}`}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 shrink-0">
        {kpis.map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-0 pt-3 px-3">
              <CardTitle className="text-xs text-muted-foreground font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Busca + toggle filtros */}
      <div className="flex items-center gap-3 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); aplicarBusca(); }}
          className="flex items-center gap-2"
        >
          <input
            ref={buscaInputRef}
            placeholder="Filtrar na lista (produto / seção / grupo / código)..."
            defaultValue=""
            className="h-9 max-w-sm rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm uppercase outline-none placeholder:text-muted-foreground placeholder:normal-case focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm border rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Aplicar
          </button>
          {buscaAplicada && (
            <button type="button" onClick={limparBusca} disabled={loading} className="text-muted-foreground hover:text-foreground disabled:opacity-50">
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
        {loading && buscaAplicada && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Aplicando filtro...
          </span>
        )}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`inline-flex items-center gap-2 h-9 px-3 text-sm border rounded-md transition-colors ${
            showFilters || hasFilters
              ? 'bg-primary text-primary-foreground border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros avançados
          {hasFilters && !showFilters && (
            <span className="ml-1 rounded-full bg-primary-foreground text-primary text-[10px] font-bold w-4 h-4 flex items-center justify-center">●</span>
          )}
        </button>
        <button
          onClick={() => setExportando(true)}
          disabled={exportando}
          className="inline-flex items-center gap-2 h-9 px-3 text-sm border rounded-md text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
        >
          {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar Excel
        </button>
      </div>

      {/* Painel filtros avançados */}
      {showFilters && (
        <div className="rounded-lg border bg-muted/30 p-4 shrink-0">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Seção</span>
              <Input key={secaoAtual} placeholder="Ex: ALIMENTOS" defaultValue={secaoAtual} className="w-36 h-9 bg-background"
                onBlur={(e) => { if (e.target.value !== secaoAtual) navigate({ secao: e.target.value }); }}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate({ secao: (e.target as HTMLInputElement).value }); }} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Grupo</span>
              <Input key={grupoAtual} placeholder="Ex: RAÇÕES" defaultValue={grupoAtual} className="w-36 h-9 bg-background"
                onBlur={(e) => { if (e.target.value !== grupoAtual) navigate({ grupo: e.target.value }); }}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate({ grupo: (e.target as HTMLInputElement).value }); }} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Curva</span>
              <Select value={curvaAtual || 'all'} onValueChange={(v) => navigate({ curva: (!v || v === 'all') ? '' : v })}>
                <SelectTrigger className="w-36 h-9 bg-background"><SelectValue placeholder="Curva" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {['A','B','C','D','E'].map(c => (
                    <SelectItem key={c} value={c}>{c} — {CURVA_GIRO[c]?.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Código de barras</span>
              <Input key={codigoAtual} placeholder="EAN..." defaultValue={codigoAtual} className="w-40 h-9 bg-background"
                onBlur={(e) => { if (e.target.value !== codigoAtual) navigate({ codigo: e.target.value }); }}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate({ codigo: (e.target as HTMLInputElement).value }); }} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">MES_REF de</span>
              <Input type="date" defaultValue={dataIniAtual} className="h-9 bg-background"
                onChange={(e) => navigate({ data_ini: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">até</span>
              <Input type="date" defaultValue={dataFimAtual} className="h-9 bg-background"
                onChange={(e) => navigate({ data_fim: e.target.value })} />
            </div>
            {hasFilters && (
              <button
                onClick={() => navigate({ secao: '', grupo: '', curva: '', codigo: '', data_ini: '', data_fim: '' })}
                className="h-9 px-3 text-xs text-destructive hover:text-destructive/80 border border-destructive/30 rounded-md"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabela */}
      <Card className="flex-1 min-h-0 overflow-hidden py-0">
        <div ref={scrollRef} className="h-full overflow-auto">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <Th col="cod_pro"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 w-24 border-b bg-white">Código</Th>
                <Th col="produto"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 min-w-[180px] border-b bg-white">Produto</Th>
                <Th col="secao"      sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 border-b bg-white">Seção</Th>
                <Th col="grupo"      sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 max-w-[90px] border-b bg-white">Grupo</Th>
                <Th col="curva"      sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 border-b bg-white">Curva</Th>
                <Th col="giro_30d"   sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 text-right border-b bg-white">Giro 30d</Th>
                <ThGroup colSpan={2} className="bg-red-50 text-red-700 border-l border-red-200">Perda qtd</ThGroup>
                <ThGroup colSpan={2} className="bg-rose-50 text-rose-700 border-l border-rose-200">Valor perda</ThGroup>
                <ThGroup colSpan={4} className="bg-emerald-50 text-emerald-700 border-l border-emerald-200">Venda</ThGroup>
                <ThGroup colSpan={2} className="bg-amber-50 text-amber-700 border-l border-amber-200">Dias oport.</ThGroup>
                <Th col="perc_perda" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 text-right border-b bg-white border-l">% Perda</Th>
                <th rowSpan={2} className="py-1.5 px-2 whitespace-nowrap text-left font-medium border-b bg-white">Nível</th>
                <th rowSpan={2} className="py-1.5 px-2 whitespace-nowrap text-center font-medium border-b bg-white">Detalhe</th>
              </tr>
              <tr className="border-b">
                <Th col="perda_30d"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-red-50/40 border-l border-red-200">30d</Th>
                <Th col="perda_12m"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-red-50/40">12m</Th>
                <Th col="valor_perda_30d" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-rose-50/40 border-l border-rose-200">30d</Th>
                <Th col="valor_perda_12m" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-rose-50/40">12m</Th>
                <Th col="venda_7d"   sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-emerald-50/40 border-l border-emerald-200">7d</Th>
                <Th col="venda_30d"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-emerald-50/40">30d</Th>
                <Th col="venda_90d"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-emerald-50/40">90d</Th>
                <Th col="venda_12m"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-emerald-50/40">12m</Th>
                <th className="py-1 px-2 whitespace-nowrap text-right font-medium border-b bg-amber-50/40 border-l border-amber-200">30d</th>
                <th className="py-1 px-2 whitespace-nowrap text-right font-medium border-b bg-amber-50/40">365d</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={19} className="text-center text-muted-foreground py-12">{loading ? 'Carregando...' : 'Nenhum produto encontrado'}</td></tr>
              ) : filtrados.map((item) => (
                <tr key={item.id_dadospro} className="border-b hover:bg-muted/40 transition-colors">
                  <td className="py-1.5 px-3 font-mono text-muted-foreground">{item.cod_pro || '—'}</td>
                  <td className="py-1.5 px-3 font-medium max-w-[200px] truncate" title={item.produto}>{item.produto}</td>
                  <td className="py-1.5 px-3 text-muted-foreground">{item.secao}</td>
                  <td className="py-1.5 px-3 text-muted-foreground max-w-[90px] truncate" title={item.grupo}>{item.grupo || '—'}</td>
                  <td className="py-1.5 px-3"><CurvaBadge curva={item.curva} /></td>
                  <td className="py-1.5 px-3 text-right"><GiroPerc value={item.giro_30d} /></td>
                  <td className="py-1.5 px-3 text-right font-mono text-red-500 border-l border-red-100">{fmt2(item.perda_30d)}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-red-600 font-semibold">{fmt2(item.perda_12m)}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-red-500 border-l border-rose-100">R$ {fmt2(item.valor_perda_30d ?? 0)}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-red-600 font-semibold">R$ {fmt2(item.valor_perda_12m ?? 0)}</td>
                  <td className="py-1.5 px-3 text-right font-mono border-l border-emerald-100">{fmt2(item.venda_7d)}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{fmt2(item.venda_30d)}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{fmt2(item.venda_90d)}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{fmt2(item.venda_12m)}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-muted-foreground border-l border-amber-100">{item.dias_oportunidade_30d}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-muted-foreground">{item.dias_oportunidade_365d}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-semibold border-l">{item.perc_perda.toFixed(1)}%</td>
                  <td className="py-1.5 px-3"><NivelBadge perc={item.perc_perda} /></td>
                  <td className="py-1.5 px-3 text-center">
                    <button
                      onClick={() => setDetalheSelecionado({ idDadospro: item.id_dadospro, produto: item.produto })}
                      title="Ver todos os campos de CONS_GIRO_ATUAL e histórico mensal"
                      className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {(hasMore || loadingMore) && (
                <tr ref={sentinelRef}>
                  <td colSpan={19} className="text-center text-muted-foreground py-4">
                    {loadingMore && (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando mais...
                      </span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {detalheSelecionado && (
        <GiroProdutoDetalheModal
          idDadospro={detalheSelecionado.idDadospro}
          filial={Number(filialAtual)}
          produto={detalheSelecionado.produto}
          onClose={() => setDetalheSelecionado(null)}
        />
      )}
    </div>
  );
}
