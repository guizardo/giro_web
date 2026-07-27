'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetchClient } from '@/lib/apiFetchClient';

interface State<T> {
  data:    T | null;
  loading: boolean;
  error:   string | null;
}

// Hook genérico para buscar dados do backend direto do browser.
// `path` deve incluir query string. Refetch automático quando path muda.
export function useGiroFetch<T>(path: string): State<T> {
  const [state, setState] = useState<State<T>>({
    data: null, loading: true, error: null,
  });

  // Evita set de estado em componente desmontado
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!path) return;
    setState(s => ({ ...s, loading: true, error: null }));
    apiFetchClient<T>(path)
      .then(data  => { if (mounted.current) setState({ data, loading: false, error: null }); })
      .catch(err  => { if (mounted.current) setState({ data: null, loading: false, error: String(err) }); });
  }, [path]);

  return state;
}
