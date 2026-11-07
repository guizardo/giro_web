'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GiroFornSimplesItem, GiroFornSimplesTotais, GiroFornSimplesProdutosResponse, GiroRegimeFornecedor,
} from '@/types/giro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { qs } from '@/lib/utils';
import { useGiroFetch } from '@/hooks/useGiroFetch';
import { useGiroInfiniteList } from '@/hooks/useGiroInfiniteList';
import { downloadXlsx } from '@/lib/exportXlsx';
import { Search, X, Loader2, Download, Play, AlertTriangle } from 'lucide-react';

interface Props { filialAtual: string }

interface Parametros { meses: string; credSimples: string; aliquota: string }

const PAGE_SIZE = 500;
const PARAM_PADRAO: Parametros = { meses: '12', credSimples: '1,0', aliquota: '11,3' };

const fmt2 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtData = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '—');
const toNum = (s: string) => s.trim().replace(',', '.');

function RegimeBadge({ regime }: { regime: GiroRegimeFornecedor }) {
  const map: Record<GiroRegimeFornecedor, [string, string]> = {
    simples: ['Simples', 'bg-indigo-100 text-indigo-700 border-indigo-200'],
    mei:     ['MEI',     'bg-purple-100 text-purple-700 border-purple-200'],
    normal:  ['Normal',  'bg-gray-50 text-gray-500 border-gray-200'],
  };
  const [label, cls] = map[regime];
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}

// ── Produtos de um fornecedor ────────────────────────────────────────────────

function ProdutosFornecedorModal({ forn, filial, param, onClose }: {
  forn: GiroFornSimplesItem; filial: string; param: Parametros; onClose: () => void;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const path = `/api/giro/fornecedores-simples${qs({
    filial, fornecedor: forn.cod_for, for_filial: forn.for_filial, limit: 1000,
    meses: param.meses, credito_simples: toNum(param.credSimples), aliquota_cbs: toNum(param.aliquota),
  })}`;
  const { data, loading, error } = useGiroFetch<GiroFornSimplesProdutosResponse>(path);
  const produtos = data?.dados ?? [];
  const comAlternativa = produtos.filter(p => p.alternativa_regime_normal).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              {forn.fantas_for || forn.nome_for} <RegimeBadge regime={forn.regime} />
            </h2>
            <p className="text-xs text-muted-foreground">
              Compras R$ {fmt2(forn.compras)} · {forn.produtos} produtos · crédito de CBS perdido estimado R$ {fmt2(forn.credito_perdido)}
              {forn.regime !== 'normal' && comAlternativa > 0 && ` · ${comAlternativa} produtos também comprados de fornecedor do regime normal`}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-auto p-4">
          {loading && <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>}
          {error && <p className="text-sm text-destructive py-8 text-center">{error}</p>}
          {!loading && !error && (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left font-medium py-1.5 px-2">Produto</th>
                  <th className="text-left font-medium py-1.5 px-2">cClassTrib</th>
                  <th className="text-right font-medium py-1.5 px-2">Compras (R$)</th>
                  <th className="text-right font-medium py-1.5 px-2">Última</th>
                  <th className="text-right font-medium py-1.5 px-2">Crédito integral</th>
                  <th className="text-right font-medium py-1.5 px-2">Crédito estimado</th>
                  <th className="text-right font-medium py-1.5 px-2">Perdido</th>
                  {forn.regime !== 'normal' && <th className="text-left font-medium py-1.5 px-2">Alternativa no regime normal</th>}
                </tr>
              </thead>
              <tbody>
                {produtos.map(p => (
                  <tr key={`${p.id_pro}-${p.pro_filial}`} className="border-t hover:bg-muted/40">
                    <td className="py-1.5 px-2 font-medium max-w-[260px] truncate" title={p.produto}>{p.produto}</td>
                    <td className="py-1.5 px-2">
                      {p.sem_cclasstrib
                        ? <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" /> alíq. cheia</span>
                        : <span className="font-mono" title={p.tratamento_cbs}>{p.cclasstrib.slice(0, 3)}.{p.cclasstrib.slice(3)}</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">{fmt2(p.compras)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-muted-foreground">{fmtData(p.ultima_compra)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{fmt2(p.credito_integral)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{fmt2(p.credito_estimado)}</td>
                    <td className={`py-1.5 px-2 text-right font-mono ${p.credito_perdido > 0.005 ? 'text-red-600' : ''}`}>{fmt2(p.credito_perdido)}</td>
                    {forn.regime !== 'normal' && (
                      <td className="py-1.5 px-2 text-muted-foreground max-w-[200px] truncate" title={p.alternativa_regime_normal ?? ''}>
                        {p.alternativa_regime_normal ?? '—'}
                      </td>
                    )}
                  </tr>
                ))}
                {produtos.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma compra no período</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tela principal ──────────────────────────────────────────────────────────

export default function GiroFornecedoresSimplesView({ filialAtual }: Props) {
  const [paramEdit, setParamEdit] = useState<Parametros>(PARAM_PADRAO);
  const [param, setParam]         = useState<Parametros>(PARAM_PADRAO);
  const [soSimples, setSoSimples] = useState(true);
  const buscaInputRef = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<GiroFornSimplesItem | null>(null);
  const [exportando, setExportando] = useState(false);

  const consolidado = filialAtual === '0';
  const paramAlterado = JSON.stringify(paramEdit) !== JSON.stringify(param);

  const buildPath = useCallback((offset: number) => `/api/giro/fornecedores-simples${qs({
    filial: filialAtual, limit: PAGE_SIZE, offset,
    meses: param.meses,
    credito_simples: toNum(param.credSimples) || undefined,
    aliquota_cbs:    toNum(param.aliquota) || undefined,
    so_simples: soSimples ? '1' : undefined,
    busca: busca || undefined,
  })}`, [filialAtual, param, soSimples, busca]);

  const resetKey = [filialAtual, JSON.stringify(param), soSimples, busca].join('|');

  const { items, totais, loading, loadingMore, error, hasMore, scrollRef, sentinelRef, loadMore } =
    useGiroInfiniteList<GiroFornSimplesItem, GiroFornSimplesTotais>({
      buildPath, pageSize: PAGE_SIZE, resetKey, enabled: !consolidado,
    });

  useEffect(() => {
    if (!exportando || loading || loadingMore) return;
    if (hasMore) { loadMore(); return; }
    const headers = ['Código', 'Fornecedor', 'Fantasia', 'Regime', 'CRT', 'Compras (R$)', '% das compras', 'Produtos', 'Última compra', 'Crédito CBS integral', 'Crédito CBS estimado', 'Crédito perdido'];
    const rows: (string | number)[][] = items.map(f => [
      f.cod_for, f.nome_for, f.fantas_for, f.regime, f.crt, f.compras, f.perc_compras, f.produtos,
      fmtData(f.ultima_compra), f.credito_integral, f.credito_estimado, f.credito_perdido,
    ]);
    rows.push([], [`Parâmetros: últimos ${param.meses} meses · CBS ${param.aliquota}% · crédito Simples ${param.credSimples}% · filial ${filialAtual}`]);
    downloadXlsx(`fornecedores_simples_filial_${filialAtual}.xlsx`, headers, rows, 'Fornecedores');
    setExportando(false);
  }, [exportando, hasMore, loading, loadingMore, items, filialAtual, param, loadMore]);

  if (consolidado) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-sm text-muted-foreground text-center">
        Selecione uma filial (não o consolidado) para analisar os fornecedores.
      </div>
    );
  }
  if (error) return <div className="h-full flex items-center justify-center text-destructive text-sm p-8">{error}</div>;

  const t = totais;
  const kpis = [
    { label: 'Compras no período', value: t ? `R$ ${fmt2(t.compras_total)}` : '—', color: 'text-foreground' },
    { label: 'Compras de Simples/MEI', value: t ? `R$ ${fmt2(t.compras_simples)}` : '—', color: 'text-indigo-600' },
    { label: '% das compras', value: t ? `${fmt2(t.perc_compras_simples)}%` : '—', color: 'text-indigo-600' },
    { label: 'Fornecedores Simples/MEI', value: t ? `${t.fornecedores_simples} de ${t.fornecedores}` : '—', color: 'text-foreground' },
    { label: 'Produtos comprados deles', value: t ? String(t.produtos_simples) : '—', color: 'text-foreground' },
    { label: 'Crédito de CBS perdido', value: t ? `R$ ${fmt2(t.credito_perdido)}` : '—', color: 'text-red-600' },
  ];

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-xl font-bold tracking-tight">Fornecedores do Simples</h1>
        <p className="text-muted-foreground text-sm">
          De quem a filial mais compra e quanto crédito de CBS deixa de aproveitar em 2027 · Filial {filialAtual}
        </p>
      </div>

      <div className="shrink-0 rounded-lg border bg-muted/30 p-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Período</span>
          <Select value={paramEdit.meses} onValueChange={(v) => setParamEdit(p => ({ ...p, meses: v ?? '12' }))}>
            <SelectTrigger className="w-36 h-9 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['3', '6', '12', '24'].map(m => <SelectItem key={m} value={m}>Últimos {m} meses</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Alíquota CBS (%)</span>
          <Input value={paramEdit.aliquota} onChange={e => setParamEdit(p => ({ ...p, aliquota: e.target.value }))} className="w-24 h-9 bg-background" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground" title="CBS paga no DAS que o comprador pode creditar, em % do valor da compra">Crédito fornec. Simples (%)</span>
          <Input value={paramEdit.credSimples} onChange={e => setParamEdit(p => ({ ...p, credSimples: e.target.value }))} className="w-24 h-9 bg-background" />
        </div>
        <button
          onClick={() => setParam(paramEdit)}
          disabled={loading || !paramAlterado}
          className="inline-flex items-center gap-2 h-9 px-3 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Recalcular
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 shrink-0">
        {kpis.map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-0 pt-2 px-3"><CardTitle className="text-[11px] text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
            <CardContent className="px-3 pb-2"><p className={`text-lg font-bold ${color}`}>{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); setBusca((buscaInputRef.current?.value ?? '').trim()); }} className="flex items-center gap-2">
          <input
            ref={buscaInputRef}
            placeholder="Nome ou fantasia do fornecedor..."
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
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={soSimples} onChange={e => setSoSimples(e.target.checked)} className="h-4 w-4 accent-primary" />
          Só Simples e MEI
        </label>
        <button
          onClick={() => setExportando(true)}
          disabled={exportando || loading}
          className="inline-flex items-center gap-2 h-9 px-3 text-sm border rounded-md text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar Excel
        </button>
      </div>

      <Card className="flex-1 min-h-0 overflow-hidden py-0">
        <div ref={scrollRef} className="h-full overflow-auto">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                {['Fornecedor', 'Regime', 'Compras (R$)', '% das compras', 'Produtos', 'Última compra', 'Crédito CBS integral', 'Crédito estimado', 'Crédito perdido'].map((h, i) => (
                  <th key={h} className={`py-1.5 px-2 border-b bg-white font-medium whitespace-nowrap ${i < 2 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-muted-foreground py-12">{loading ? 'Calculando...' : 'Nenhum fornecedor encontrado'}</td></tr>
              ) : items.map(f => (
                <tr key={`${f.cod_for}-${f.for_filial}`} onClick={() => setSelecionado(f)} className="cursor-pointer hover:bg-muted/40" title="Ver produtos comprados deste fornecedor">
                  <td className="py-1.5 px-2 border-b font-medium max-w-[260px] truncate">
                    {f.fantas_for || f.nome_for}
                    {f.fantas_for && f.nome_for && f.fantas_for !== f.nome_for && <span className="ml-1 text-muted-foreground font-normal">{f.nome_for}</span>}
                  </td>
                  <td className="py-1.5 px-2 border-b"><RegimeBadge regime={f.regime} /></td>
                  <td className="py-1.5 px-2 border-b text-right font-mono">{fmt2(f.compras)}</td>
                  <td className="py-1.5 px-2 border-b text-right font-mono">{fmt2(f.perc_compras)}%</td>
                  <td className="py-1.5 px-2 border-b text-right font-mono">{f.produtos}</td>
                  <td className="py-1.5 px-2 border-b text-right font-mono text-muted-foreground">{fmtData(f.ultima_compra)}</td>
                  <td className="py-1.5 px-2 border-b text-right font-mono">{fmt2(f.credito_integral)}</td>
                  <td className="py-1.5 px-2 border-b text-right font-mono">{fmt2(f.credito_estimado)}</td>
                  <td className={`py-1.5 px-2 border-b text-right font-mono font-semibold ${f.credito_perdido > 0.005 ? 'text-red-600' : ''}`}>{fmt2(f.credito_perdido)}</td>
                </tr>
              ))}
              {(hasMore || loadingMore) && items.length > 0 && (
                <tr ref={sentinelRef}>
                  <td colSpan={9} className="text-center text-muted-foreground py-4">
                    {loadingMore && <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando mais...</span>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selecionado && (
        <ProdutosFornecedorModal forn={selecionado} filial={filialAtual} param={param} onClose={() => setSelecionado(null)} />
      )}
    </div>
  );
}
