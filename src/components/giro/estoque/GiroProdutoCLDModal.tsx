'use client';

import { useEffect } from 'react';
import { GiroProdutoCLD, GiroProdutoCLDResponse, GiroSimuladorCBSItem } from '@/types/giro';
import { qs } from '@/lib/utils';
import { useGiroFetch } from '@/hooks/useGiroFetch';
import { X, Loader2 } from 'lucide-react';

interface Props {
  idDadospro: number;
  codFilial:  number;
  onClose:    () => void;
  // Quando aberto pelo Simulador CBS 2027: linha já calculada pelo
  // /api/giro/simulador-cbs, exibida lado a lado com o CLD de hoje.
  simulacao?: GiroSimuladorCBSItem;
}

// Texto do CST de PIS/COFINS de hoje (ex.: "01" ou "PIS 01 · COFINS 06" quando diferem).
function textoCstPisCofins(c: GiroProdutoCLD): string {
  const pis = (c.aliquotas_custos.cst_pis || '').trim();
  const cof = (c.aliquotas_custos.cst_cofins || '').trim();
  if (!pis && !cof) return 'sem CST';
  return pis === cof ? `CST ${pis}` : `PIS ${pis || '—'} · COFINS ${cof || '—'}`;
}

// Coluna "Hoje" vem do próprio CLD do modal (débitos/créditos de PIS+COFINS da
// última NF); coluna "2027" vem da linha calculada pelo simulador.
function Comparativo2027({ s, cld }: { s: GiroSimuladorCBSItem; cld: GiroProdutoCLD }) {
  const fmt = (v: number | null) => v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (v: number | null) => v == null ? '—' : `${fmt(v)}%`;
  const benef: Record<string, string> = { perdeu: 'Perdeu benefício', ganhou: 'Ganhou benefício', sem_mudanca: 'Sem mudança' };
  const a = cld.aliquotas_custos;
  const debHoje  = cld.impostos_debitos.pis  + cld.impostos_debitos.cofins;
  const credHoje = cld.impostos_creditos.pis + cld.impostos_creditos.cofins;
  const pagHoje  = cld.impostos_a_pagar.pis  + cld.impostos_a_pagar.cofins;
  const linhas: [string, string, string, boolean?][] = [
    ['Tributo federal', 'PIS + COFINS', `CBS ${pct(s.aliquota_cbs_efetiva)}`],
    ['Situação', textoCstPisCofins(cld),
      s.sem_cclasstrib ? 'sem cClassTrib (000.001)' : `cClassTrib ${s.cclasstrib.slice(0, 3)}.${s.cclasstrib.slice(3)}`],
    ['Alíquota', `${pct(a.pis)} + ${pct(a.cofins)}`, pct(s.aliquota_cbs_efetiva)],
    ['Débito', fmt(debHoje), fmt(s.cbs_debito)],
    ['Crédito (última NF)', fmt(credHoje), fmt(s.cbs_credito)],
    ['A pagar', fmt(pagHoje), fmt(s.cbs_pagar)],
    ['Custo CLD', fmt(s.custo_cld_hoje), fmt(s.custo_cld_2027)],
    ['Margem CLD (preço atual)', pct(s.margem_hoje), pct(s.margem_2027), s.margem_2027 < s.margem_hoje - 0.005],
    ['Preço', fmt(s.preco), s.preco_sugerido != null ? `${fmt(s.preco_sugerido)} (sugerido)` : '—'],
  ];
  return (
    <div className="rounded-lg border border-indigo-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-indigo-700">Simulação CBS 2027</p>
        <p className="text-[10px] text-muted-foreground">
          {s.sem_cclasstrib
            ? 'sem cClassTrib · alíquota cheia'
            : `cClassTrib ${s.cclasstrib.slice(0, 3)}.${s.cclasstrib.slice(3)} · ${s.tratamento_cbs}${s.cclasstrib_do_ncm ? ' (NCM)' : ''}`}
          {' · '}{benef[s.beneficio]}
          {s.fornecedor_simples && ' · fornecedor do Simples'}
        </p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left font-medium py-1"></th>
            <th className="text-right font-medium py-1">Hoje</th>
            <th className="text-right font-medium py-1">2027</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(([label, hoje, futuro, alerta]) => (
            <tr key={label} className="border-t">
              <td className="py-1 text-muted-foreground">{label}</td>
              <td className="py-1 text-right font-mono">{hoje}</td>
              <td className={`py-1 text-right font-mono ${alerta ? 'text-red-600 font-semibold' : ''}`}>{futuro}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const fmt2 = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Bloco({ titulo, linhas }: { titulo: string; linhas: [string, string][] }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{titulo}</p>
      <dl className="space-y-1">
        {linhas.map(([label, valor]) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function GiroProdutoCLDModal({ idDadospro, codFilial, onClose, simulacao }: Props) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const path = `/api/giro/produto-cld${qs({ id_dadospro: String(idDadospro), cod_filial: String(codFilial) })}`;
  const { data, loading, error } = useGiroFetch<GiroProdutoCLDResponse>(path);
  const cld = data?.cld;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3 sticky top-0 bg-white">
          <div>
            <h2 className="text-sm font-bold">Custo Líquido / Lucro Líquido com Impostos</h2>
            {cld && <p className="text-xs text-muted-foreground truncate max-w-md">{cld.produto}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando...
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive py-8 text-center">{error}</p>
          )}

          {cld && (
            <>
              {/* Resumo */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] text-muted-foreground">Imposto</p>
                  <p className="text-sm font-bold">{fmt2(cld.imposto)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] text-muted-foreground">Custo CLD</p>
                  <p className="text-sm font-bold">{fmt2(cld.custo_liquido.custo)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] text-muted-foreground">Lucro CLD</p>
                  <p className={`text-sm font-bold ${cld.lucro_liquido < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {fmt2(cld.lucro_liquido)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] text-muted-foreground">Margem CLD</p>
                  <p className="text-sm font-bold">{fmt2(cld.margem_cld)}%</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] text-muted-foreground">Markup CLD</p>
                  <p className="text-sm font-bold">{fmt2(cld.markup_cld)}%</p>
                </div>
              </div>

              {simulacao && (
                <>
                  <Comparativo2027 s={simulacao} cld={cld} />
                  {Math.abs(simulacao.margem_hoje - cld.margem_cld) > 0.01 && (
                    <p className="text-[11px] text-amber-700">
                      Margem de hoje no simulador ({fmt2(simulacao.margem_hoje)}%) difere do CLD ({fmt2(cld.margem_cld)}%):
                      os dados do produto mudaram desde o cálculo da lista.
                    </p>
                  )}
                </>
              )}

              {/* Preço / Custo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground">Preço atual</p>
                  <p className="text-sm font-mono font-medium">{fmt2(cld.preco)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground">Custo atual</p>
                  <p className="text-sm font-mono font-medium">{fmt2(cld.custo)}</p>
                </div>
              </div>

              {/* CST ICMS e PIS/COFINS (situação atual) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">CST ICMS</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between gap-2"><span className="text-muted-foreground">XML (entrada)</span><span className="font-medium text-right">{cld.cst_desc_entrada || '—'}</span></div>
                    <div className="flex justify-between gap-2"><span className="text-muted-foreground">Saída</span><span className="font-medium text-right">{cld.cst_desc_saida || '—'}</span></div>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">CST PIS / COFINS (saída)</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between gap-2"><span className="text-muted-foreground">PIS</span><span className="font-medium font-mono">{cld.aliquotas_custos.cst_pis || '—'} · {fmt2(cld.aliquotas_custos.pis)}%</span></div>
                    <div className="flex justify-between gap-2"><span className="text-muted-foreground">COFINS</span><span className="font-medium font-mono">{cld.aliquotas_custos.cst_cofins || '—'} · {fmt2(cld.aliquotas_custos.cofins)}%</span></div>
                  </div>
                </div>
              </div>

              {/* Detalhes */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <Bloco titulo="Alíquotas e Custos" linhas={[
                  ['ICMS',       fmt2(cld.aliquotas_custos.icms)],
                  ['PIS',        fmt2(cld.aliquotas_custos.pis)],
                  ['COFINS',     fmt2(cld.aliquotas_custos.cofins)],
                  ['FCP',        fmt2(cld.aliquotas_custos.fcp)],
                  ['Custo Fixo', fmt2(cld.aliquotas_custos.custo_fixo)],
                  ['Comissão',   fmt2(cld.aliquotas_custos.comissao)],
                ]} />
                <Bloco titulo="Impostos Créditos" linhas={[
                  ['ICMS',   fmt2(cld.impostos_creditos.icms)],
                  ['PIS',    fmt2(cld.impostos_creditos.pis)],
                  ['COFINS', fmt2(cld.impostos_creditos.cofins)],
                ]} />
                <Bloco titulo="Impostos Débitos" linhas={[
                  ['ICMS',   fmt2(cld.impostos_debitos.icms)],
                  ['PIS',    fmt2(cld.impostos_debitos.pis)],
                  ['COFINS', fmt2(cld.impostos_debitos.cofins)],
                  ['FCP',    fmt2(cld.impostos_debitos.fcp ?? 0)],
                ]} />
                <Bloco titulo="Impostos a Pagar" linhas={[
                  ['ICMS',   fmt2(cld.impostos_a_pagar.icms)],
                  ['PIS',    fmt2(cld.impostos_a_pagar.pis)],
                  ['COFINS', fmt2(cld.impostos_a_pagar.cofins)],
                  ['FCP',    fmt2(cld.impostos_a_pagar.fcp ?? 0)],
                ]} />
                <Bloco titulo="Custo Líquido" linhas={[
                  ['Custo', fmt2(cld.custo_liquido.custo)],
                ]} />
                <Bloco titulo="NF de referência" linhas={[
                  ['Nº',   cld.nf.numero ? String(cld.nf.numero) : '—'],
                  ['Data', cld.nf.data || '—'],
                  ['CFOP', cld.nf.cfop || '—'],
                ]} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
