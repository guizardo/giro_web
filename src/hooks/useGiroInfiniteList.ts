'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetchClient } from '@/lib/apiFetchClient';

interface UseGiroInfiniteListOpts {
  // Monta a URL da pagina dado o offset (limit fixo definido por pageSize).
  buildPath: (offset: number) => string;
  pageSize: number;
  // Muda sempre que filtro/ordenacao/filial mudar -> reseta e busca a partir do offset 0.
  resetKey: string;
  // false = nao busca nada (ex: nenhum fornecedor selecionado ainda).
  enabled?: boolean;
}

interface GiroListResponse<TItem, TTotais> {
  dados?: TItem[];
  totais?: TTotais;
}

interface UseGiroInfiniteListResult<TItem, TTotais> {
  items: TItem[];
  totais: TTotais | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  // Anexar ao container com overflow-auto que rola a tabela.
  scrollRef: (node: HTMLElement | null) => void;
  // Anexar a um elemento sentinela logo apos a ultima linha da tabela (div, tr, etc.).
  sentinelRef: (node: HTMLElement | null) => void;
  // Dispara a busca da proxima pagina manualmente (ex: enquanto uma busca local
  // estiver ativa, pra garantir que ela enxergue a lista inteira, nao so o que
  // ja rolou na tela).
  loadMore: () => void;
}

// Scroll infinito: acumula paginas de 100 em 100 conforme o usuario rola ate o
// fim da tabela. Nao depende de um total exposto pelo backend — para de buscar
// quando uma pagina volta com menos itens que pageSize (sinal de que acabou).
export function useGiroInfiniteList<TItem, TTotais = unknown>(
  opts: UseGiroInfiniteListOpts,
): UseGiroInfiniteListResult<TItem, TTotais> {
  const { buildPath, pageSize, resetKey, enabled = true } = opts;

  const [items, setItems] = useState<TItem[]>([]);
  const [totais, setTotais] = useState<TTotais | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const [scrollNode, setScrollNode] = useState<HTMLElement | null>(null);
  const [sentinelNode, setSentinelNode] = useState<HTMLElement | null>(null);

  const loadMore = useCallback(() => {
    if (!enabled || loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    apiFetchClient<GiroListResponse<TItem, TTotais>>(buildPath(offsetRef.current))
      .then((resp) => {
        const novos = resp?.dados ?? [];
        setItems(prev => [...prev, ...novos]);
        offsetRef.current += novos.length;
        const more = novos.length === pageSize;
        hasMoreRef.current = more;
        setHasMore(more);
      })
      .catch(e => setError(String(e)))
      .finally(() => { setLoadingMore(false); loadingRef.current = false; });
  }, [buildPath, pageSize, enabled]);

  // Reset + primeira pagina sempre que filtro/ordenacao/gate mudar.
  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setTotais(null);
      setLoading(false);
      setHasMore(false);
      hasMoreRef.current = false;
      return;
    }
    offsetRef.current = 0;
    // Bloqueia loadMore() (sentinela/scroll infinito) enquanto a propria
    // primeira pagina do reset esta em voo — sem isso, se a sentinela ja
    // ficar visivel com a tabela ainda vazia, o IntersectionObserver dispara
    // um loadMore() concorrente pro mesmo offset=0, que ACRESCENTA (nao
    // substitui) os itens por cima do que o reset acabou de setar,
    // duplicando as linhas.
    loadingRef.current = true;
    hasMoreRef.current = true;
    setHasMore(true);
    setItems([]);
    setError(null);
    setLoading(true);
    apiFetchClient<GiroListResponse<TItem, TTotais>>(buildPath(0))
      .then((resp) => {
        const primeiros = resp?.dados ?? [];
        setItems(primeiros);
        setTotais(resp?.totais ?? null);
        offsetRef.current = primeiros.length;
        const more = primeiros.length === pageSize;
        hasMoreRef.current = more;
        setHasMore(more);
      })
      .catch(e => setError(String(e)))
      .finally(() => { setLoading(false); loadingRef.current = false; });
    // resetKey resume as dependencias reais (filtros/ordenacao); buildPath muda
    // junto mas nao precisa disparar reset sozinho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, enabled]);

  // Observa o sentinela dentro do proprio container de scroll da tabela.
  useEffect(() => {
    if (!scrollNode || !sentinelNode) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { root: scrollNode, rootMargin: '300px' },
    );
    observer.observe(sentinelNode);
    return () => observer.disconnect();
  }, [scrollNode, sentinelNode, loadMore]);

  const scrollRef = useCallback((node: HTMLElement | null) => setScrollNode(node), []);
  const sentinelRef = useCallback((node: HTMLElement | null) => setSentinelNode(node), []);

  return { items, totais, loading, loadingMore, error, hasMore, scrollRef, sentinelRef, loadMore };
}
