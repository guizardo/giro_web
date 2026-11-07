'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { GiroCorrelacaoProduto, GiroCorrelacaoTotais } from '@/types/giro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { qs } from '@/lib/utils';
import { useGiroInfiniteList } from '@/hooks/useGiroInfiniteList';
import { Search, X, Loader2 } from 'lucide-react';

interface Props {
  filialAtual:          string;
  limitCorrelatoAtual:  string;
}

const PAGE_SIZE = 30;

export default function GiroCorrelacaoView({ filialAtual, limitCorrelatoAtual }: Props) {
  const router = useRouter();
  const buscaInputRef = useRef<HTMLInputElement>(null);
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const aplicarBusca = () => setBuscaAplicada((buscaInputRef.current?.value ?? '').trim());
  const limparBusca = () => {
    if (buscaInputRef.current) buscaInputRef.current.value = '';
    setBuscaAplicada('');
  };

  const navigate = (params: Record<string, string>) => {
    router.push(`/estoque/correlacao${qs({
      limit_correlato: limitCorrelatoAtual,
      ...params,
    })}`);
  };

  // busca e limit_correlato vao pro backend (server-side - precisam valer pro
  // catalogo inteiro, nao so pra pagina ja carregada); paginacao via offset,
  // acumulada pelo scroll infinito (mesmo hook usado em Parados/Ruptura/Perda).
  const buildPath = useCallback((offset: number) => `/api/giro/correlacao${qs({
    filial:          filialAtual,
    limit_base:      PAGE_SIZE,
    offset,
    limit_correlato: limitCorrelatoAtual,
    busca:           buscaAplicada || undefined,
  })}`, [filialAtual, limitCorrelatoAtual, buscaAplicada]);

  const resetKey = [filialAtual, limitCorrelatoAtual, buscaAplicada].join('|');

  const { items, totais, loading, loadingMore, error, hasMore, scrollRef, sentinelRef } =
    useGiroInfiniteList<GiroCorrelacaoProduto, GiroCorrelacaoTotais>({ buildPath, pageSize: PAGE_SIZE, resetKey });

  const fmt2 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

  const filial = filialAtual;
  const totalBase = totais?.total_base;

  if (error) return (
    <div className="h-full flex items-center justify-center text-destructive text-sm p-8">{error}</div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-6 pb-4 shrink-0 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Correlação de Produtos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {filial === '0' ? 'Consolidado' : `Filial ${filial}`}
              {' · '}
              {loading ? 'Carregando...' : `${items.length} de ${totalBase ?? '?'} produtos-base carregados`}
              {' · '}análise de cesta de compras (o que é vendido junto)
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Correlatos por item</span>
            <Input
              key={limitCorrelatoAtual}
              type="number" min={1} max={20}
              defaultValue={limitCorrelatoAtual}
              className="w-24 h-9 bg-background"
              onBlur={(e) => { if (e.target.value !== limitCorrelatoAtual) navigate({ limit_correlato: e.target.value }); }}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate({ limit_correlato: (e.target as HTMLInputElement).value }); }}
            />
          </div>
        </div>

        {/* Busca por descrição do produto principal (base) — server-side, vale pro catálogo inteiro */}
        <form
          onSubmit={(e) => { e.preventDefault(); aplicarBusca(); }}
          className="flex items-center gap-2"
        >
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={buscaInputRef}
              placeholder="Buscar produto principal por descrição ou EAN..."
              defaultValue=""
              className="h-9 w-full rounded-lg border border-input bg-transparent pl-8 pr-8 py-1 text-sm uppercase outline-none placeholder:text-muted-foreground placeholder:normal-case focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm border rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {loading && buscaAplicada ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Aplicar
          </button>
          {buscaAplicada && (
            <button type="button" onClick={limparBusca} disabled={loading} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {/* Área rolável — o <main> do layout é overflow-hidden, então o scroll precisa
          acontecer aqui dentro, não na página (mesmo padrão de GiroParadosView). */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-6 pb-6">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              {loading ? 'Carregando...' : buscaAplicada
                ? 'Nenhum produto principal encontrado com esse termo de busca.'
                : 'Nenhuma correlação encontrada para esta filial. Verifique se o processo de correlação (Monitor_Giro) já rodou para este banco.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((produto) => (
              <Card key={produto.id_produto_base}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate" title={produto.desc_base}>
                        {produto.desc_base}
                      </CardTitle>
                      {produto.ean_base && (
                        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">EAN {produto.ean_base}</p>
                      )}
                    </div>
                    <span
                      className="shrink-0 inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-primary/20"
                      title={`pontuação bruta: ${fmt2(produto.pontuacao_base)}`}
                    >
                      {/* correlatos[0] é sempre o RANK_POS=1, mesma linha de onde pontuacao_base vem */}
                      nota {produto.correlatos[0]?.nota_comparativa ?? fmt2(produto.pontuacao_base)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <table className="w-full text-xs border-separate border-spacing-0">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1 pr-2 text-left font-medium text-muted-foreground">#</th>
                        <th className="py-1 pr-2 text-left font-medium text-muted-foreground">Correlato</th>
                        <th className="py-1 pr-2 text-right font-medium text-muted-foreground">Juntos</th>
                        <th className="py-1 pr-2 text-right font-medium text-muted-foreground">Confiança</th>
                        <th className="py-1 pr-2 text-right font-medium text-muted-foreground">Alavancagem</th>
                        <th className="py-1 pr-2 text-right font-medium text-muted-foreground">Preço Médio</th>
                        <th className="py-1 pr-2 text-right font-medium text-muted-foreground">Margem</th>
                        <th className="py-1 text-right font-medium text-muted-foreground">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produto.correlatos.map((c) => {
                        // Margem em % (mais justo que R$ pra decidir "tem margem boa" -
                        // R$ absoluto penaliza item barato mesmo com % saudavel, ex.:
                        // pao de forma R$5,79/23,1% x carne moida R$30,99/20,0%. Sem
                        // preco_medio (linha antiga), cai no criterio antigo em R$.
                        const margemPct = c.preco_medio != null && c.preco_medio > 0
                          ? (c.margem_rs / c.preco_medio) * 100
                          : null;
                        const temMargemBoa = margemPct != null ? margemPct >= 20 : c.margem_rs >= 3.00;
                        return (
                        <tr key={c.id_produto_correlato} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-1.5 pr-2 text-muted-foreground">{c.rank}</td>
                          <td className="py-1.5 pr-2 font-medium max-w-[180px]" title={c.desc_correlato}>
                            <span className="truncate block">{c.desc_correlato}</span>
                            {c.cod_correlato && (
                              <span className="block text-[10px] font-mono font-normal text-muted-foreground">{c.cod_correlato}</span>
                            )}
                            {c.tipo_correlacao === 'COMPENSACAO' && (
                              temMargemBoa ? (
                                <span
                                  className="inline-flex items-center rounded border px-1 py-0 text-[10px] font-normal text-blue-700 border-blue-300 bg-blue-50 mt-0.5"
                                  title={`Item genérico/universal (aparece em muitas cestas), mas com margem real (${margemPct != null ? fmtPct(margemPct) : `R$ ${fmt2(c.margem_rs)}`}) — pode servir pra compensar reajuste de preço numa promoção. A nota já considera a genericidade.`}
                                >
                                  compensação
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center rounded border px-1 py-0 text-[10px] font-normal text-muted-foreground border-muted-foreground/30 mt-0.5"
                                  title={`Item genérico/universal (aparece em muitas cestas) e com margem baixa (${margemPct != null ? fmtPct(margemPct) : `R$ ${fmt2(c.margem_rs)}`}) — não serve pra compensar preço, aparece aqui só porque é popular em geral. A nota já penaliza isso.`}
                                >
                                  genérico
                                </span>
                              )
                            )}
                          </td>
                          <td className="py-1.5 pr-2 text-right font-mono">{c.juntos}</td>
                          <td className="py-1.5 pr-2 text-right font-mono">{fmtPct(c.confianca_pct)}</td>
                          <td className="py-1.5 pr-2 text-right font-mono">{fmt2(c.alavancagem)}x</td>
                          <td className="py-1.5 pr-2 text-right font-mono">
                            {c.preco_medio != null ? fmt2(c.preco_medio) : '—'}
                          </td>
                          <td className="py-1.5 pr-2 text-right font-mono">
                            {fmt2(c.margem_rs)}
                            {margemPct != null && (
                              <span className="block text-[10px] text-muted-foreground">
                                {fmtPct(margemPct)}
                              </span>
                            )}
                          </td>
                          <td
                            className="py-1.5 text-right font-mono font-semibold text-primary"
                            title={`pontuação bruta: ${fmt2(c.pontuacao)}`}
                          >
                            {c.nota_comparativa != null ? c.nota_comparativa : fmt2(c.pontuacao)}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
            {/* Sentinela do scroll infinito — igual ao padrão de GiroParadosView */}
            {(hasMore || loadingMore) && (
              <div ref={sentinelRef} className="col-span-full text-center text-muted-foreground py-4 text-sm">
                {loadingMore && (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando mais...
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
