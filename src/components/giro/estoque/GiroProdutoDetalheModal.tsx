'use client';

import { useEffect } from 'react';
import { GiroProdutoDetalheResponse, GiroCampoBruto } from '@/types/giro';
import { qs } from '@/lib/utils';
import { useGiroFetch } from '@/hooks/useGiroFetch';
import { X, Loader2 } from 'lucide-react';

interface Props {
  idDadospro: number;
  filial:     number;
  produto?:   string;
  onClose:    () => void;
}

function fmtValue(v: GiroCampoBruto): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? v.toLocaleString('pt-BR')
      : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  const s = String(v).trim();
  return s === '' ? '—' : s;
}

function fmtLabel(campo: string): string {
  return campo.replace(/_/g, ' ').toUpperCase();
}

export default function GiroProdutoDetalheModal({ idDadospro, filial, produto, onClose }: Props) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const path = `/api/giro/produto-detalhe${qs({ id_dadospro: String(idDadospro), filial: String(filial) })}`;
  const { data, loading, error } = useGiroFetch<GiroProdutoDetalheResponse>(path);

  const atualEntries = data?.atual ? Object.entries(data.atual) : [];
  const mensal = data?.mensal ?? [];
  const colunasMensal = mensal.length > 0 ? Object.keys(mensal[0]) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-sm font-bold">Detalhe bruto — CONS_GIRO_ATUAL / CONS_GIRO_MENSAL</h2>
            {produto && <p className="text-xs text-muted-foreground truncate max-w-md">{produto}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive py-8 text-center">{error}</p>
          )}

          {!loading && !error && data && (
            <>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Linha atual (CONS_GIRO_ATUAL) — filial {filial}, id_dadospro {idDadospro}
                </p>
                {atualEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">Nenhum registro encontrado para essa combinação de filial/id_dadospro.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5 rounded-lg border p-3">
                    {atualEntries.map(([campo, valor]) => (
                      <div key={campo} className="min-w-0">
                        <dt className="text-[9px] uppercase tracking-wide text-muted-foreground truncate" title={fmtLabel(campo)}>
                          {fmtLabel(campo)}
                        </dt>
                        <dd className="text-xs font-mono font-medium truncate" title={fmtValue(valor)}>
                          {fmtValue(valor)}
                        </dd>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Histórico mensal (CONS_GIRO_MENSAL) — {mensal.length} {mensal.length === 1 ? 'mês' : 'meses'}
                </p>
                {mensal.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">Nenhum histórico mensal encontrado.</p>
                ) : (
                  <div className="rounded-lg border overflow-auto max-h-80">
                    <table className="w-full text-[10px] border-separate border-spacing-0">
                      <thead className="sticky top-0 bg-muted/60">
                        <tr>
                          {colunasMensal.map((c) => (
                            <th key={c} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap border-b">
                              {fmtLabel(c)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mensal.map((row, i) => (
                          <tr key={i} className="border-b hover:bg-muted/30">
                            {colunasMensal.map((c) => (
                              <td key={c} className="px-2 py-1 font-mono whitespace-nowrap">
                                {fmtValue(row[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
