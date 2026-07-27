'use client';

import { useRouter } from 'next/navigation';
import {
  GiroRupturaItem, GiroRupturaTotais,
  GiroFornecedor, GiroFornecedoresResponse, CURVA_GIRO,
} from '@/types/giro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useState, useEffect, useCallback, useRef } from 'react';
import { qs } from '@/lib/utils';
import { useGiroFetch } from '@/hooks/useGiroFetch';
import { useGiroInfiniteList } from '@/hooks/useGiroInfiniteList';
import { Building2, ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, X, Search, Calculator, Loader2, Info, Download } from 'lucide-react';
import GiroProdutoCLDModal from './GiroProdutoCLDModal';
import GiroProdutoDetalheModal from './GiroProdutoDetalheModal';
import { downloadXlsx } from '@/lib/exportXlsx';

type SortKey = keyof Pick<GiroRupturaItem,
  'cod_pro' | 'produto' | 'secao' | 'grupo' | 'curva' |
  'giro_30d' | 'giro_12m' |
  'venda_7d' | 'venda_30d' | 'venda_90d' | 'venda_12m' |
  'estoque' | 'cobertura_dias' | 'delta_minimo'
>;
type SortDir = 'asc' | 'desc';

interface Props {
  filialAtual:     string;
  fornecedorAtual: string;
  forFilialAtual:  string;
  nomeForAtual:    string;
  secaoAtual:      string;
  grupoAtual:      string;
  curvaAtual:      string;
  codigoAtual:     string;
  dataIniAtual:    string;
  dataFimAtual:    string;
  incNegativo:     boolean;
}

const emptyTotais: GiroRupturaTotais = {
  total_risco: 0, em_ruptura: 0, estoque_negativo: 0,
  cobertura_7d: 0, abaixo_minimo: 0, sem_compra_90d: 0,
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

function SituacaoBadge({ situacao }: { situacao: string }) {
  const map: Record<string, string> = {
    CRITICO: 'bg-red-100 text-red-700 border-red-200',
    URGENTE: 'bg-orange-100 text-orange-700 border-orange-200',
    RISCO:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${map[situacao] ?? ''}`}>
      {situacao}
    </span>
  );
}

function CoberturaCell({ dias }: { dias: number }) {
  const color =
    dias < 0  ? 'text-red-600 font-bold' :
    dias < 7  ? 'text-red-500 font-semibold' :
    dias < 15 ? 'text-orange-500 font-semibold' : 'text-foreground';
  return <span className={`font-mono text-xs ${color}`}>{dias < 0 ? 'RUPTURA' : `${dias.toFixed(0)}d`}</span>;
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

// ── Seletor de fornecedor (busca com debounce) ──────────────────────────────

function FornecedorPicker({ onSelect }: { onSelect: (f: GiroFornecedor) => void }) {
  const [termo, setTermo]         = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen]           = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(termo.trim()), 300);
    return () => clearTimeout(t);
  }, [termo]);

  const path = debounced.length >= 2 ? `/api/giro/fornecedores${qs({ busca: debounced, limit: 20 })}` : '';
  const { data, loading } = useGiroFetch<GiroFornecedoresResponse>(path);
  const resultados = data?.fornecedores ?? [];

  return (
    <div className="w-full max-w-md space-y-4 relative">
      <div className="flex items-center gap-2 border rounded-lg px-3 h-11 bg-white">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={termo}
          onChange={(e) => { setTermo(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar fornecedor por nome ou fantasia..."
          className="flex-1 outline-none text-sm bg-transparent"
        />
      </div>
      {open && debounced.length >= 2 && (
        <div className="absolute z-20 w-full rounded-lg border bg-white shadow-lg max-h-72 overflow-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground p-3">Buscando...</p>
          ) : resultados.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3">Nenhum fornecedor encontrado</p>
          ) : resultados.map((f) => (
            <button
              key={`${f.cod_for}-${f.for_filial}`}
              type="button"
              onClick={() => { onSelect(f); setOpen(false); setTermo(''); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors border-b last:border-0"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{f.fantas_for || f.nome_for}</p>
                {f.fantas_for && f.nome_for && f.fantas_for !== f.nome_for && (
                  <p className="text-xs text-muted-foreground truncate">{f.nome_for}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GiroRupturaFornecedorView({
  filialAtual, fornecedorAtual, forFilialAtual, nomeForAtual,
  secaoAtual, grupoAtual, curvaAtual, codigoAtual,
  dataIniAtual, dataFimAtual, incNegativo,
}: Props) {
  const router = useRouter();
  const buscaInputRef = useRef<HTMLInputElement>(null);
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const aplicarBusca = () => setBuscaAplicada((buscaInputRef.current?.value ?? '').trim());
  const limparBusca = () => {
    if (buscaInputRef.current) buscaInputRef.current.value = '';
    setBuscaAplicada('');
  };
  const [sortKey,     setSortKey]     = useState<SortKey>('cobertura_dias');
  const [sortDir,     setSortDir]     = useState<SortDir>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [cldSelecionado, setCldSelecionado] = useState<{ idDadospro: number; codFilial: number } | null>(null);
  const [detalheSelecionado, setDetalheSelecionado] = useState<{ idDadospro: number; produto: string } | null>(null);

  const temFornecedor = !!(fornecedorAtual && forFilialAtual);
  const hasFilters = !!(secaoAtual || grupoAtual || curvaAtual || codigoAtual || dataIniAtual || dataFimAtual);

  const navigate = (params: Record<string, string>) => {
    router.push(`/estoque/ruptura-fornecedor${qs({
      fornecedor: fornecedorAtual, for_filial: forFilialAtual, nome_for: nomeForAtual,
      secao: secaoAtual, grupo: grupoAtual, curva: curvaAtual,
      codigo: codigoAtual, data_ini: dataIniAtual, data_fim: dataFimAtual,
      inc_negativo: incNegativo ? '1' : '',
      ...params,
    })}`);
  };

  const selecionarFornecedor = (f: GiroFornecedor) => {
    router.push(`/estoque/ruptura-fornecedor${qs({
      fornecedor: String(f.cod_for), for_filial: String(f.for_filial),
      nome_for: f.fantas_for || f.nome_for,
    })}`);
  };

  const buildPath = useCallback((offset: number) => `/api/giro/ruptura-fornecedor${qs({
    filial:       filialAtual,
    fornecedor:   fornecedorAtual,
    for_filial:   forFilialAtual,
    limit:        PAGE_SIZE,
    offset,
    order_by:     sortKey,
    order_dir:    sortDir,
    secao:        secaoAtual   || undefined,
    grupo:        grupoAtual   || undefined,
    curva:        curvaAtual   || undefined,
    codigo:       codigoAtual  || undefined,
    busca:        buscaAplicada || undefined,
    data_ini:     dataIniAtual || undefined,
    data_fim:     dataFimAtual || undefined,
    inc_negativo: incNegativo ? '1' : undefined,
  })}`, [filialAtual, fornecedorAtual, forFilialAtual, sortKey, sortDir, secaoAtual, grupoAtual, curvaAtual, codigoAtual, buscaAplicada, dataIniAtual, dataFimAtual, incNegativo]);

  const resetKey = [filialAtual, fornecedorAtual, forFilialAtual, secaoAtual, grupoAtual, curvaAtual, codigoAtual, buscaAplicada, dataIniAtual, dataFimAtual, incNegativo, sortKey, sortDir].join('|');

  const { items, totais, loading, loadingMore, error, hasMore, scrollRef, sentinelRef, loadMore } =
    useGiroInfiniteList<GiroRupturaItem, GiroRupturaTotais>({
      buildPath, pageSize: PAGE_SIZE, resetKey, enabled: temFornecedor,
    });

  const [exportando, setExportando] = useState(false);

  const filial = filialAtual;

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir(['produto','secao','grupo','cod_pro','curva'].includes(key) ? 'asc' : key === 'cobertura_dias' ? 'asc' : 'desc');
    }
  };

  // Ordenação e busca (produto/seção/grupo/código) já vêm do backend.
  const filtrados = items;

  const fmt2 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    if (!exportando || loading || loadingMore) return;
    if (hasMore) { loadMore(); return; }
    const headers = ['Código','Produto','Seção','Grupo','Curva','Giro 30d (%)','Giro 12m (%)','Venda 7d','Venda 30d','Venda 90d','Venda 12m','Dias Oport. 30d','Dias Oport. 365d','Cobertura (dias)','Estoque','Delta mín.','Situação'];
    const rows = filtrados.map(d => [d.cod_pro, d.produto, d.secao, d.grupo, d.curva, d.giro_30d, d.giro_12m, d.venda_7d, d.venda_30d, d.venda_90d, d.venda_12m, d.dias_oportunidade_30d, d.dias_oportunidade_365d, d.cobertura_dias, d.estoque, d.delta_minimo, d.situacao]);
    downloadXlsx(`ruptura_fornecedor_${fornecedorAtual}_filial_${filialAtual}.xlsx`, headers, rows);
    setExportando(false);
  }, [exportando, hasMore, loading, loadingMore, filtrados, filialAtual, fornecedorAtual, loadMore]);

  const t = totais ?? emptyTotais;
  const kpis = [
    { label: 'Total em risco',   value: t.total_risco,      color: 'text-orange-600' },
    { label: 'Em ruptura',       value: t.em_ruptura,       color: 'text-red-600' },
    { label: 'Est. negativo',    value: t.estoque_negativo, color: 'text-red-700' },
    { label: 'Cobertura ≤ 7d',   value: t.cobertura_7d,     color: 'text-orange-500' },
    { label: 'Abaixo mínimo',    value: t.abaixo_minimo,    color: 'text-yellow-600' },
    { label: 'Sem compra 90d',   value: t.sem_compra_90d,   color: 'text-muted-foreground' },
  ];

  // ── Sem fornecedor selecionado: mostra o seletor ────────────────────────
  if (!temFornecedor) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Ruptura por Fornecedor</h1>
          <p className="text-muted-foreground text-sm">Selecione um fornecedor para ver o risco de ruptura dos itens dele</p>
        </div>
        <FornecedorPicker onSelect={selecionarFornecedor} />
      </div>
    );
  }

  if (error) return (
    <div className="h-full flex items-center justify-center text-destructive text-sm p-8">{error}</div>
  );

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Ruptura por Fornecedor</h1>
          <p className="text-muted-foreground text-sm">
            {loading ? 'Carregando...' : `${filtrados.length} de ${t.total_risco} produtos`}
            {' · '}{filial === '0' ? 'Consolidado' : `Filial ${filial}`}
            {' · '}<span className="font-medium text-foreground">{nomeForAtual || `Fornecedor ${fornecedorAtual}`}</span>
          </p>
        </div>
        <button
          onClick={() => router.push('/estoque/ruptura-fornecedor')}
          className="text-xs text-indigo-600 hover:underline shrink-0"
        >
          Trocar fornecedor
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
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

        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={incNegativo}
            onChange={(e) => navigate({ inc_negativo: e.target.checked ? '1' : '' })}
            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
          />
          Incluir estoque negativo
        </label>
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
                <Th col="cod_pro"      sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 w-24 border-b bg-white">Código</Th>
                <Th col="produto"      sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 min-w-[180px] border-b bg-white">Produto</Th>
                <Th col="secao"        sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 border-b bg-white">Seção</Th>
                <Th col="grupo"        sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 max-w-[90px] border-b bg-white">Grupo</Th>
                <Th col="curva"        sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 border-b bg-white">Curva</Th>
                <ThGroup colSpan={2} className="bg-blue-50 text-blue-700 border-l border-blue-200">Giro</ThGroup>
                <ThGroup colSpan={4} className="bg-emerald-50 text-emerald-700 border-l border-emerald-200">Venda</ThGroup>
                <ThGroup colSpan={2} className="bg-amber-50 text-amber-700 border-l border-amber-200">Dias oport.</ThGroup>
                <Th col="cobertura_dias" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 text-right border-b bg-white border-l">Cobertura</Th>
                <Th col="estoque"      sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 text-right border-b bg-white">Estoque</Th>
                <Th col="delta_minimo" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} rowSpan={2} className="py-1.5 px-2 text-right border-b bg-white">Delta mín.</Th>
                <th rowSpan={2} className="py-1.5 px-2 whitespace-nowrap text-left font-medium border-b bg-white">Situação</th>
                <th rowSpan={2} className="py-1.5 px-2 whitespace-nowrap text-center font-medium border-b bg-white">CLD</th>
                <th rowSpan={2} className="py-1.5 px-2 whitespace-nowrap text-center font-medium border-b bg-white">Detalhe</th>
              </tr>
              <tr className="border-b">
                <Th col="giro_30d"     sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-blue-50/40 border-l border-blue-200">30d</Th>
                <Th col="giro_12m"     sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-blue-50/40">12m</Th>
                <Th col="venda_7d"     sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-emerald-50/40 border-l border-emerald-200">7d</Th>
                <Th col="venda_30d"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-emerald-50/40">30d</Th>
                <Th col="venda_90d"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-emerald-50/40">90d</Th>
                <Th col="venda_12m"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-1 px-2 text-right border-b bg-emerald-50/40">12m</Th>
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
                  <td className="py-1.5 px-3 text-right border-l border-blue-100"><GiroPerc value={item.giro_30d} /></td>
                  <td className="py-1.5 px-3 text-right"><GiroPerc value={item.giro_12m} /></td>
                  <td className="py-1.5 px-3 text-right font-mono border-l border-emerald-100">{fmt2(item.venda_7d)}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{fmt2(item.venda_30d)}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{fmt2(item.venda_90d)}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{fmt2(item.venda_12m)}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-muted-foreground border-l border-amber-100">{item.dias_oportunidade_30d}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-muted-foreground">{item.dias_oportunidade_365d}</td>
                  <td className="py-1.5 px-3 text-right border-l"><CoberturaCell dias={item.cobertura_dias} /></td>
                  <td className="py-1.5 px-3 text-right font-mono">{fmt2(item.estoque)}</td>
                  <td className={`py-1.5 px-3 text-right font-mono ${item.delta_minimo < 0 ? 'text-red-600' : ''}`}>
                    {fmt2(item.delta_minimo)}
                  </td>
                  <td className="py-1.5 px-3"><SituacaoBadge situacao={item.situacao} /></td>
                  <td className="py-1.5 px-3 text-center">
                    {item.cod_filial != null && (
                      <button
                        onClick={() => setCldSelecionado({ idDadospro: item.id_dadospro, codFilial: item.cod_filial! })}
                        title="Ver cálculo de custo líquido / lucro líquido com impostos (CLD)"
                        className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
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

      {cldSelecionado && (
        <GiroProdutoCLDModal
          idDadospro={cldSelecionado.idDadospro}
          codFilial={cldSelecionado.codFilial}
          onClose={() => setCldSelecionado(null)}
        />
      )}

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
