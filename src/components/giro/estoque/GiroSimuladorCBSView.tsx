'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GiroSimuladorCBSItem, GiroSimuladorCBSTotais, GiroBeneficioCBS, CURVA_GIRO,
} from '@/types/giro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { qs } from '@/lib/utils';
import { useGiroInfiniteList } from '@/hooks/useGiroInfiniteList';
import { downloadXlsx } from '@/lib/exportXlsx';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, X, Search,
  Calculator, Loader2, Download, AlertTriangle, Play,
} from 'lucide-react';
import GiroProdutoCLDModal from './GiroProdutoCLDModal';

// Chaves de ordenação aceitas pelo backend ('' = padrão: benefício alterado
// primeiro, depois maior perda mensal).
type SortKey = '' | 'produto' | 'curva' | 'venda_30d' | 'preco' | 'margem_hoje' |
  'margem_2027' | 'variacao_perc' | 'impacto_mensal' | 'aliquota_cbs';
type SortDir = 'asc' | 'desc';
type FiltroBeneficio = '' | 'alterado' | GiroBeneficioCBS;

interface Parametros {
  aliquota:   string;
  modo:       'fora' | 'dentro';
  credSimples: string;
  margemAlvo: string;
}

interface Props { filialAtual: string }

const PAGE_SIZE = 1000; // cada página recalcula a filial no backend: páginas grandes = menos recálculos
const PARAM_PADRAO: Parametros = { aliquota: '11,3', modo: 'fora', credSimples: '1,0', margemAlvo: '' };

const fmt2 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v: number) => `${fmt2(v)}%`;
const toNum = (s: string) => s.trim().replace(',', '.');

function CurvaBadge({ curva }: { curva: string }) {
  const meta = CURVA_GIRO[curva] ?? { label: curva, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${meta.color}`}>
      {curva}
    </span>
  );
}

function BeneficioBadge({ beneficio }: { beneficio: GiroBeneficioCBS }) {
  const map: Record<GiroBeneficioCBS, [string, string]> = {
    perdeu:      ['Perdeu benefício', 'bg-red-100 text-red-700 border-red-200'],
    ganhou:      ['Ganhou benefício', 'bg-green-100 text-green-700 border-green-200'],
    sem_mudanca: ['Sem mudança',      'bg-gray-50 text-gray-500 border-gray-200'],
  };
  const [label, cls] = map[beneficio];
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${cls}`}>{label}</span>;
}

function ClassTribCell({ item }: { item: GiroSimuladorCBSItem }) {
  if (item.sem_cclasstrib) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 whitespace-nowrap"
        title="Produto e NCM sem cClassTrib cadastrado: calculado com alíquota cheia (000001)"
      >
        <AlertTriangle className="h-3 w-3" /> sem cClassTrib · alíq. cheia
      </span>
    );
  }
  return (
    <span className="font-mono text-[11px]" title={`${item.tratamento_cbs}${item.cclasstrib_do_ncm ? ' · cClassTrib do NCM' : ''}`}>
      {item.cclasstrib.slice(0, 3)}.{item.cclasstrib.slice(3)}
      {item.reducao_cbs > 0 && <span className="text-muted-foreground"> −{item.reducao_cbs}%</span>}
      {item.cclasstrib_do_ncm && <span className="text-muted-foreground"> (NCM)</span>}
    </span>
  );
}

function MargemCell({ value, base }: { value: number; base?: number }) {
  const caiu = base !== undefined && value < base - 0.005;
  const subiu = base !== undefined && value > base + 0.005;
  const color = value < 0 ? 'text-red-600 font-semibold' : caiu ? 'text-red-600' : subiu ? 'text-green-700' : '';
  return <span className={`font-mono ${color}`}>{fmtPct(value)}</span>;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="inline h-3 w-3 ml-1 text-muted-foreground/50" />;
  return sortDir === 'asc' ? <ChevronUp className="inline h-3 w-3 ml-1" /> : <ChevronDown className="inline h-3 w-3 ml-1" />;
}

function Th({ children, col, sortKey, sortDir, onSort, className = '' }: {
  children: React.ReactNode; col?: SortKey; sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void; className?: string;
}) {
  if (!col) return <th className={`whitespace-nowrap font-medium py-1.5 px-2 border-b bg-white ${className}`}>{children}</th>;
  return (
    <th
      className={`cursor-pointer select-none hover:bg-muted/60 whitespace-nowrap font-medium py-1.5 px-2 border-b bg-white ${className}`}
      onClick={() => onSort(col)}
    >
      {children}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );
}

export default function GiroSimuladorCBSView({ filialAtual }: Props) {
  // Parâmetros: edição local, só valem ao clicar em "Recalcular"
  const [paramEdit, setParamEdit] = useState<Parametros>(PARAM_PADRAO);
  const [param, setParam]         = useState<Parametros>(PARAM_PADRAO);

  const buscaInputRef = useRef<HTMLInputElement>(null);
  const [busca, setBusca]   = useState('');
  const [secao, setSecao]   = useState('');
  const [grupo, setGrupo]   = useState('');
  const [curva, setCurva]   = useState('');
  const [beneficio, setBeneficio]       = useState<FiltroBeneficio>('');
  const [soSemClass, setSoSemClass]     = useState(false);
  const [soPerdeMargem, setSoPerdeMargem] = useState(false);
  const [showFilters, setShowFilters]   = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [cldSelecionado, setCldSelecionado] = useState<{ idDadospro: number; codFilial: number } | null>(null);
  const [exportando, setExportando] = useState(false);

  const consolidado = filialAtual === '0';
  const hasFilters = !!(secao || grupo || curva);
  const paramAlterado = JSON.stringify(paramEdit) !== JSON.stringify(param);

  const buildPath = useCallback((offset: number) => `/api/giro/simulador-cbs${qs({
    filial:          filialAtual,
    limit:           PAGE_SIZE,
    offset,
    aliquota_cbs:    toNum(param.aliquota) || undefined,
    modo:            param.modo,
    credito_simples: toNum(param.credSimples) || undefined,
    margem_alvo:     toNum(param.margemAlvo) || undefined,
    secao:           secao || undefined,
    grupo:           grupo || undefined,
    curva:           curva || undefined,
    busca:           busca || undefined,
    beneficio:       beneficio || undefined,
    sem_cclasstrib:  soSemClass ? '1' : undefined,
    perde_margem:    soPerdeMargem ? '1' : undefined,
    order_by:        sortKey || undefined,
    order_dir:       sortKey ? sortDir : undefined,
  })}`, [filialAtual, param, secao, grupo, curva, busca, beneficio, soSemClass, soPerdeMargem, sortKey, sortDir]);

  const resetKey = [filialAtual, JSON.stringify(param), secao, grupo, curva, busca, beneficio, soSemClass, soPerdeMargem, sortKey, sortDir].join('|');

  const { items, totais, loading, loadingMore, error, hasMore, scrollRef, sentinelRef, loadMore } =
    useGiroInfiniteList<GiroSimuladorCBSItem, GiroSimuladorCBSTotais>({
      buildPath, pageSize: PAGE_SIZE, resetKey, enabled: !consolidado,
    });

  const regimeSimples = !!totais?.regime_simples;

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir(key === 'produto' || key === 'curva' || key === 'impacto_mensal' || key === 'margem_2027' ? 'asc' : 'desc');
    }
  };

  // Exportação: carrega todas as páginas e gera o Excel com os parâmetros usados
  useEffect(() => {
    if (!exportando || loading || loadingMore) return;
    if (hasMore) { loadMore(); return; }
    const headers = [
      'Código', 'Produto', 'Seção', 'Grupo', 'Curva', 'Venda 30d', 'Preço atual', 'Custo',
      'cClassTrib', 'Tratamento CBS', 'Sem cClassTrib (alíq. cheia)', 'Redução CBS (%)', 'Alíq. CBS efetiva (%)',
      'Custo CLD hoje', 'Margem hoje (%)', 'PIS+COFINS a pagar', 'CBS débito', 'CBS crédito', 'CBS a pagar',
      'Custo CLD 2027', 'Margem 2027 (%)', 'Preço sugerido', 'Variação (R$)', 'Variação (%)',
      'Impacto mensal (R$)', 'Benefício', 'Fornecedor Simples',
    ];
    const rows = items.map(d => [
      d.cod_pro, d.produto, d.secao, d.grupo, d.curva, d.venda_30d, d.preco, d.custo,
      d.cclasstrib, d.tratamento_cbs, d.sem_cclasstrib ? 'Sim' : 'Não', d.reducao_cbs, d.aliquota_cbs_efetiva,
      d.custo_cld_hoje, d.margem_hoje, d.pis_cofins_pagar, d.cbs_debito, d.cbs_credito, d.cbs_pagar,
      d.custo_cld_2027, d.margem_2027, d.preco_sugerido, d.variacao_valor, d.variacao_perc,
      d.impacto_mensal, d.beneficio, d.fornecedor_simples ? 'Sim' : 'Não',
    ]);
    rows.push(
      [],
      [`Parâmetros: CBS ${param.aliquota}% · cálculo por ${param.modo} · crédito Simples ${param.credSimples}% · ${param.margemAlvo ? `margem-alvo ${param.margemAlvo}%` : 'mantém margem atual'} · filial ${filialAtual}`],
    );
    downloadXlsx(`simulador_cbs_2027_filial_${filialAtual}.xlsx`, headers, rows, 'Simulador CBS');
    setExportando(false);
  }, [exportando, hasMore, loading, loadingMore, items, filialAtual, param, loadMore]);

  if (consolidado) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-sm text-muted-foreground text-center">
        O simulador usa o preço e o custo de cada filial.<br />Selecione uma filial (não o consolidado) para simular.
      </div>
    );
  }

  if (error) return <div className="h-full flex items-center justify-center text-destructive text-sm p-8">{error}</div>;

  const t = totais;
  const kpis: { label: string; value: string; color: string; onClick?: () => void; ativo?: boolean }[] = [
    { label: 'Produtos', value: t ? String(t.produtos) : '—', color: 'text-foreground' },
    { label: 'Perdem margem', value: t ? String(t.perdem_margem) : '—', color: 'text-red-600',
      onClick: () => setSoPerdeMargem(v => !v), ativo: soPerdeMargem },
    { label: 'Perderam benefício', value: t ? String(t.perderam_beneficio) : '—', color: 'text-red-700',
      onClick: () => setBeneficio(b => b === 'perdeu' ? '' : 'perdeu'), ativo: beneficio === 'perdeu' },
    { label: 'Ganharam benefício', value: t ? String(t.ganharam_beneficio) : '—', color: 'text-green-700',
      onClick: () => setBeneficio(b => b === 'ganhou' ? '' : 'ganhou'), ativo: beneficio === 'ganhou' },
    { label: 'Sem cClassTrib (alíq. cheia)', value: t ? String(t.sem_cclasstrib) : '—', color: 'text-amber-600',
      onClick: () => setSoSemClass(v => !v), ativo: soSemClass },
    { label: 'Comprados de Simples', value: t ? String(t.fornecedor_simples) : '—', color: 'text-indigo-600' },
    { label: 'Impacto mensal no lucro', value: t ? `R$ ${fmt2(t.impacto_mensal)}` : '—',
      color: t && t.impacto_mensal < 0 ? 'text-red-600' : 'text-green-700' },
    ...(!regimeSimples ? [{ label: 'Reajuste médio (pond. venda)',
      value: t?.reajuste_medio_ponderado != null ? fmtPct(t.reajuste_medio_ponderado) : '—', color: 'text-foreground' }] : []),
  ];

  const colSpan = regimeSimples ? 12 : 15;

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-xl font-bold tracking-tight">Simulador CBS 2027</h1>
        <p className="text-muted-foreground text-sm">
          {loading ? 'Calculando...' : `${items.length} de ${t?.produtos ?? 0} produtos`}
          {' · '}Filial {filialAtual}
          {' · '}PIS/COFINS substituídos pela CBS de {param.aliquota}%, cálculo por {param.modo}
        </p>
      </div>

      {/* Parâmetros da simulação */}
      <div className="shrink-0 rounded-lg border bg-muted/30 p-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Alíquota CBS (%)</span>
          <Input value={paramEdit.aliquota} onChange={e => setParamEdit(p => ({ ...p, aliquota: e.target.value }))} className="w-24 h-9 bg-background" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Cálculo</span>
          <Select value={paramEdit.modo} onValueChange={(v) => setParamEdit(p => ({ ...p, modo: v === 'dentro' ? 'dentro' : 'fora' }))}>
            <SelectTrigger className="w-36 h-9 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fora">Por fora (LC 214)</SelectItem>
              <SelectItem value="dentro">Por dentro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground" title="Crédito de CBS sobre o valor da compra quando o fornecedor é do Simples (CBS paga no DAS)">Crédito fornec. Simples (%)</span>
          <Input value={paramEdit.credSimples} onChange={e => setParamEdit(p => ({ ...p, credSimples: e.target.value }))} className="w-24 h-9 bg-background" />
        </div>
        {!regimeSimples && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Margem-alvo (%)</span>
            <Input placeholder="manter atual" value={paramEdit.margemAlvo} onChange={e => setParamEdit(p => ({ ...p, margemAlvo: e.target.value }))} className="w-28 h-9 bg-background" />
          </div>
        )}
        <button
          onClick={() => setParam(paramEdit)}
          disabled={loading || !paramAlterado}
          className="inline-flex items-center gap-2 h-9 px-3 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Recalcular
        </button>
        {JSON.stringify(paramEdit) !== JSON.stringify(PARAM_PADRAO) && (
          <button onClick={() => { setParamEdit(PARAM_PADRAO); setParam(PARAM_PADRAO); }} className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground">
            Restaurar padrão
          </button>
        )}
      </div>

      {regimeSimples && (
        <div className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Filial no Simples Nacional: a tela mostra só a análise de perda e ganho de benefício, sem preço sugerido.
        </div>
      )}
      {!!t?.sem_cclasstrib && (
        <div className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t.sem_cclasstrib} {t.sem_cclasstrib === 1 ? 'item está' : 'itens estão'} sem cClassTrib no produto e no NCM e {t.sem_cclasstrib === 1 ? 'foi calculado' : 'foram calculados'} com alíquota cheia de CBS.
          <button onClick={() => setSoSemClass(v => !v)} className="underline">{soSemClass ? 'Mostrar todos' : 'Ver itens'}</button>
        </div>
      )}

      {/* KPIs (os clicáveis filtram a lista) */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 shrink-0">
        {kpis.map(({ label, value, color, onClick, ativo }) => (
          <Card
            key={label}
            onClick={onClick}
            className={`${onClick ? 'cursor-pointer hover:bg-muted/40' : ''} ${ativo ? 'ring-2 ring-primary' : ''}`}
          >
            <CardHeader className="pb-0 pt-2 px-3">
              <CardTitle className="text-[11px] text-muted-foreground font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2">
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Busca, benefício, filtros, exportar */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); setBusca((buscaInputRef.current?.value ?? '').trim()); }} className="flex items-center gap-2">
          <input
            ref={buscaInputRef}
            placeholder="Produto / seção / grupo / código..."
            className="h-9 w-64 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm uppercase outline-none placeholder:text-muted-foreground placeholder:normal-case focus-visible:border-ring"
          />
          <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 h-9 px-3 text-sm border rounded-md text-muted-foreground hover:text-foreground disabled:opacity-50">
            <Search className="h-4 w-4" /> Aplicar
          </button>
          {busca && (
            <button type="button" onClick={() => { if (buscaInputRef.current) buscaInputRef.current.value = ''; setBusca(''); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="inline-flex rounded-md border overflow-hidden text-xs">
          {([['', 'Todos'], ['alterado', 'Benefício alterado'], ['perdeu', 'Perdeu'], ['ganhou', 'Ganhou']] as [FiltroBeneficio, string][]).map(([v, label]) => (
            <button
              key={v || 'todos'}
              onClick={() => setBeneficio(v)}
              className={`h-9 px-3 border-r last:border-0 ${beneficio === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`inline-flex items-center gap-2 h-9 px-3 text-sm border rounded-md ${showFilters || hasFilters ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filtros
        </button>
        <button
          onClick={() => setExportando(true)}
          disabled={exportando || loading}
          className="inline-flex items-center gap-2 h-9 px-3 text-sm border rounded-md text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar Excel
        </button>
      </div>

      {showFilters && (
        <div className="rounded-lg border bg-muted/30 p-3 shrink-0 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Seção (código)</span>
            <Input key={`s${secao}`} defaultValue={secao} className="w-32 h-9 bg-background"
              onBlur={(e) => setSecao(e.target.value.trim())}
              onKeyDown={(e) => { if (e.key === 'Enter') setSecao((e.target as HTMLInputElement).value.trim()); }} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Grupo</span>
            <Input key={`g${grupo}`} defaultValue={grupo} className="w-36 h-9 bg-background"
              onBlur={(e) => setGrupo(e.target.value.trim())}
              onKeyDown={(e) => { if (e.key === 'Enter') setGrupo((e.target as HTMLInputElement).value.trim()); }} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Curva</span>
            <Select value={curva || 'all'} onValueChange={(v) => setCurva(!v || v === 'all' ? '' : v)}>
              <SelectTrigger className="w-36 h-9 bg-background"><SelectValue placeholder="Curva" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {['A', 'B', 'C', 'D', 'E'].map(c => <SelectItem key={c} value={c}>{c} — {CURVA_GIRO[c]?.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <button onClick={() => { setSecao(''); setGrupo(''); setCurva(''); }} className="h-9 px-3 text-xs text-destructive border border-destructive/30 rounded-md">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Tabela */}
      <Card className="flex-1 min-h-0 overflow-hidden py-0">
        <div ref={scrollRef} className="h-full overflow-auto">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <Th sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-left">Código</Th>
                <Th col="produto" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-left min-w-[180px]">Produto</Th>
                <Th col="curva" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-left">Curva</Th>
                <Th col="aliquota_cbs" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-left">cClassTrib</Th>
                <Th sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-left">Benefício</Th>
                <Th col="venda_30d" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right">Venda 30d</Th>
                <Th col="preco" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right">Preço</Th>
                <Th col="margem_hoje" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right border-l">Margem hoje</Th>
                <Th sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right">PIS+COFINS</Th>
                <Th sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right border-l">CBS a pagar</Th>
                <Th col="margem_2027" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right">Margem 2027</Th>
                {!regimeSimples && <>
                  <Th sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right border-l">Preço sugerido</Th>
                  <Th col="variacao_perc" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right">Var.</Th>
                </>}
                <Th col="impacto_mensal" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right border-l">Impacto/mês</Th>
                <Th sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-center">CLD</Th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={colSpan} className="text-center text-muted-foreground py-12">{loading ? 'Calculando...' : 'Nenhum produto encontrado'}</td></tr>
              ) : items.map((item) => (
                <tr key={item.id_dadospro} className={`hover:bg-muted/40 ${item.beneficio === 'perdeu' ? 'bg-red-50/50' : item.beneficio === 'ganhou' ? 'bg-green-50/50' : ''}`}>
                  <td className="py-1.5 px-2 border-b font-mono text-muted-foreground">{item.cod_pro || '—'}</td>
                  <td className="py-1.5 px-2 border-b font-medium max-w-[220px] truncate" title={`${item.produto} · ${item.secao} · ${item.grupo}`}>
                    {item.produto}
                    {item.fornecedor_simples && (
                      <span className="ml-1 rounded bg-indigo-50 border border-indigo-200 px-1 text-[9px] font-semibold text-indigo-700" title="Última compra de fornecedor do Simples: crédito de CBS reduzido">SIMPLES</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 border-b"><CurvaBadge curva={item.curva} /></td>
                  <td className="py-1.5 px-2 border-b"><ClassTribCell item={item} /></td>
                  <td className="py-1.5 px-2 border-b"><BeneficioBadge beneficio={item.beneficio} /></td>
                  <td className="py-1.5 px-2 border-b text-right font-mono">{fmt2(item.venda_30d)}</td>
                  <td className="py-1.5 px-2 border-b text-right font-mono">{fmt2(item.preco)}</td>
                  <td className="py-1.5 px-2 border-b text-right border-l"><MargemCell value={item.margem_hoje} /></td>
                  <td className="py-1.5 px-2 border-b text-right font-mono text-muted-foreground">{fmt2(item.pis_cofins_pagar)}</td>
                  <td className="py-1.5 px-2 border-b text-right font-mono border-l" title={`Débito ${fmt2(item.cbs_debito)} − crédito ${fmt2(item.cbs_credito)} · alíquota efetiva ${fmtPct(item.aliquota_cbs_efetiva)}`}>
                    {fmt2(item.cbs_pagar)}
                  </td>
                  <td className="py-1.5 px-2 border-b text-right"><MargemCell value={item.margem_2027} base={item.margem_hoje} /></td>
                  {!regimeSimples && <>
                    <td className="py-1.5 px-2 border-b text-right font-mono font-semibold border-l">{item.preco_sugerido != null ? fmt2(item.preco_sugerido) : '—'}</td>
                    <td className={`py-1.5 px-2 border-b text-right font-mono ${(item.variacao_perc ?? 0) > 0.005 ? 'text-red-600' : (item.variacao_perc ?? 0) < -0.005 ? 'text-green-700' : ''}`}>
                      {item.variacao_perc != null ? `${item.variacao_perc > 0 ? '+' : ''}${fmtPct(item.variacao_perc)}` : '—'}
                    </td>
                  </>}
                  <td className={`py-1.5 px-2 border-b text-right font-mono border-l ${item.impacto_mensal < -0.005 ? 'text-red-600' : item.impacto_mensal > 0.005 ? 'text-green-700' : ''}`}>
                    {fmt2(item.impacto_mensal)}
                  </td>
                  <td className="py-1.5 px-2 border-b text-center">
                    <button
                      onClick={() => setCldSelecionado({ idDadospro: item.id_dadospro, codFilial: item.cod_filial })}
                      title="Ver cálculo CLD atual do produto"
                      className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {(hasMore || loadingMore) && items.length > 0 && (
                <tr ref={sentinelRef}>
                  <td colSpan={colSpan} className="text-center text-muted-foreground py-4">
                    {loadingMore && <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando mais...</span>}
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
    </div>
  );
}
