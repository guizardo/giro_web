'use client';

import { useEffect } from 'react';
import { GiroProdutoCLDResponse } from '@/types/giro';
import { qs } from '@/lib/utils';
import { useGiroFetch } from '@/hooks/useGiroFetch';
import { X, Loader2 } from 'lucide-react';

interface Props {
  idDadospro: number;
  codFilial:  number;
  onClose:    () => void;
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

export default function GiroProdutoCLDModal({ idDadospro, codFilial, onClose }: Props) {
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

              {/* CST ICMS */}
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">CST ICMS</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">XML (entrada)</span><span className="font-medium">{cld.cst_desc_entrada || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Saída</span><span className="font-medium">{cld.cst_desc_saida || '—'}</span></div>
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
