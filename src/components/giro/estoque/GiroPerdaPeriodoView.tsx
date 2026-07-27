'use client';

import { useRouter } from 'next/navigation';
import { GiroPerdaPeriodoItem, GiroPerdaPeriodoTotais, CURVA_GIRO } from '@/types/giro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useState, useCallback, useEffect, useRef } from 'react';
import { qs } from '@/lib/utils';
import { useGiroInfiniteList } from '@/hooks/useGiroInfiniteList';
import { ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, X, Loader2, Info, Download, Search } from 'lucide-react';
import GiroProdutoDetalheModal from './GiroProdutoDetalheModal';
import { downloadXlsx } from '@/lib/exportXlsx';

type SortKey = keyof Pick<GiroPerdaPeriodoItem,
  'cod_pro' | 'produto' | 'secao' | 'grupo' | 'curva' |
  'perda_un' | 'valor_perda' | 'ocorrencias'
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

const emptyTotais: GiroPerdaPeriodoTotais = {
  produtos_perda: 0, perda_periodo_un: 0, valor_perda_periodo: 0,
};

const PAGE_SIZE = 500;

function CurvaBadge({ curva }: { curva: string }) {
  const meta = CURVA_GIRO[curva] ?? { label: curva, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${meta.color}`}>
      {curva} · {meta.label}
    </span>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="inline h-3 w-3 ml-1 text-muted-foreground/50" />;
  return sortDir === 'asc'
    ? <ChevronUp className="inline h-3 w-3 ml-1" />
    : <ChevronDown className="inline h-3 w-3 ml-1" />;
}

function Th({ children, col, sortKey, sortDir, onSort, className = '' }: {
  children: React.ReactNode; col: SortKey; sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void; className?: string;
}) {
  return (
    <th
      className={`cursor-pointer select-none hover:bg-muted/60 whitespace-nowrap text-left font-medium ${className}`}
      onClick={() => onSort(col)}
    >
      {children}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );
}

export default function GiroPerdaPeriodoView({
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
  const [sortKey,     setSortKey]     = useState<SortKey>('valor_perda');
  const [sortDir,     setSortDir]     = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [detalheSelecionado, setDetalheSelecionado] = useState<{ idDadospro: number; produto: string } | null>(null);

  const hasFilters = !!(secaoAtual || grupoAtual || curvaAtual || codigoAtual);

  const buildPath = useCallback((offset: number) => `/api/giro/perda-periodo${qs({
    filial:    filialAtual,
    limit:     PAGE_SIZE,
    offset,
    order_by:  sortKey,
    order_dir: sortDir,
    data_ini:  dataIniAtual,
    data_fim:  dataFimAtual,
    secao:     secaoAtual  || undefined,
    grupo:     grupoAtual  || undefined,
    curva:     curvaAtual  || undefined,
    codigo:    codigoAtual || undefined,
    busca:     buscaAplicada || undefined,
  })}`, [filialAtual, sortKey, sortDir, dataIniAtual, dataFimAtual, secaoAtual, grupoAtual, curvaAtual, codigoAtual, buscaAplicada]);

  const resetKey = [filialAtual, secaoAtual, grupoAtual, curvaAtual, codigoAtual, buscaAplicada, dataIniAtual, dataFimAtual, sortKey, sortDir].join('|');

  const { items, totais, loading, loadingMore, error, hasMore, scrollRef, sentinelRef, loadMore } =
    useGiroInfiniteList<GiroPerdaPeriodoItem, GiroPerdaPeriodoTotais>({ buildPath, pageSize: PAGE_SIZE, resetKey });

  const [exportando, setExportando] = useState(false);

  const filial = filialAtual;

  const navigate = (params: Record<string, string>) => {
    router.push(`/estoque/perda-periodo${qs({
      secao: secaoAtual, grupo: grupoAtual, curva: curvaAtual, codigo: codigoAtual,
      data_ini: dataIniAtual, data_fim: dataFimAtual,
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

  // Ordenação e busca (produto/seção/grupo/código) já vêm do backend.
  const filtrados = items;

  useEffect(() => {
    if (!exportando || loading || loadingMore) return;
    if (hasMore) { loadMore(); return; }
    const headers = ['Código','Produto','Seção','Grupo','Curva','Perda (un)','Valor Perda','Ocorrências'];
    const rows = filtrados.map(d => [d.cod_pro, d.produto, d.secao, d.grupo, d.curva, d.perda_un, d.valor_perda, d.ocorrencias]);
    downloadXlsx(`perda_periodo_filial_${filialAtual}.xlsx`, headers, rows);
    setExportando(false);
  }, [exportando, hasMore, loading, loadingMore, filtrados, filialAtual, loadMore]);

  const t = totais ?? emptyTotais;
  const kpis = [
    { label: 'Produtos c/ perda', value: t.produtos_perda, color: 'text-orange-600' },
    { label: 'Perda no período (un)', value: t.perda_periodo_un.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), color: 'text-red-600' },
    { label: 'Valor perdido no período', value: `R$ ${fmt2(t.valor_perda_periodo)}`, color: 'text-red-700' },
    { label: 'SKUs afetados', value: t.produtos_perda, color: 'text-muted-foreground' },
  ];

  if (error) return (
    <div className="h-full flex items-center justify-center text-destructive text-sm p-8">{error}</div>
  );

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-xl font-bold tracking-tight">Perda Desconhecida por Período</h1>
        <p className="text-muted-foreground text-sm">
          {loading ? 'Carregando...' : `${filtrados.length} de ${t.produtos_perda} produtos`}
          {' · '}{filial === '0' ? 'Consolidado' : `Filial ${filial}`}
          {' · '}{dataIniAtual} a {dataFimAtual}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
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

      {/* Intervalo de datas (obrigatório) + busca + toggle filtros */}
      <div className="flex flex-wrap items-end gap-3 shrink-0">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">De</span>
          <Input type="date" defaultValue={dataIniAtual} className="h-9 w-40"
            onChange={(e) => navigate({ data_ini: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Até</span>
          <Input type="date" defaultValue={dataFimAtual} className="h-9 w-40"
            onChange={(e) => navigate({ data_fim: e.target.value })} />
        </div>
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
            {hasFilters && (
              <button
                onClick={() => navigate({ secao: '', grupo: '', curva: '', codigo: '' })}
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
                <Th col="cod_pro"     sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-2 px-3 w-24 border-b bg-white">Código</Th>
                <Th col="produto"     sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-2 px-3 min-w-[200px] border-b bg-white">Produto</Th>
                <Th col="secao"       sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-2 px-3 border-b bg-white">Seção</Th>
                <Th col="grupo"       sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-2 px-3 max-w-[90px] border-b bg-white">Grupo</Th>
                <Th col="curva"       sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-2 px-3 border-b bg-white">Curva</Th>
                <Th col="perda_un"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-2 px-3 text-right border-b bg-white">Perda (un)</Th>
                <Th col="valor_perda" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-2 px-3 text-right border-b bg-white">Valor perdido</Th>
                <Th col="ocorrencias" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="py-2 px-3 text-right border-b bg-white">Ocorrências</Th>
                <th className="py-2 px-3 whitespace-nowrap text-center font-medium border-b bg-white">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-muted-foreground py-12">{loading ? 'Carregando...' : 'Nenhuma perda desconhecida no período'}</td></tr>
              ) : filtrados.map((item) => (
                <tr key={item.id_dadospro} className="border-b hover:bg-muted/40 transition-colors">
                  <td className="py-1.5 px-3 font-mono text-muted-foreground">{item.cod_pro || '—'}</td>
                  <td className="py-1.5 px-3 font-medium max-w-[220px] truncate" title={item.produto}>{item.produto}</td>
                  <td className="py-1.5 px-3 text-muted-foreground">{item.secao}</td>
                  <td className="py-1.5 px-3 text-muted-foreground max-w-[90px] truncate" title={item.grupo}>{item.grupo || '—'}</td>
                  <td className="py-1.5 px-3"><CurvaBadge curva={item.curva} /></td>
                  <td className="py-1.5 px-3 text-right font-mono text-red-600 font-semibold">{fmt2(item.perda_un)}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-red-700 font-semibold">R$ {fmt2(item.valor_perda)}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-muted-foreground">{item.ocorrencias}</td>
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
                  <td colSpan={9} className="text-center text-muted-foreground py-4">
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
