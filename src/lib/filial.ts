import 'server-only';
import { cookies } from 'next/headers';
import { FILIAL } from './api';

/**
 * Retorna a filial selecionada pelo usuário (cookie giro_filial).
 * '0' = consolidado (sem filtro de filial).
 * Fallback: env FILIAL.
 */
export function getFilialSelecionada(): string {
  try {
    const cookieStore = cookies();
    return cookieStore.get('giro_filial')?.value ?? String(FILIAL);
  } catch {
    return String(FILIAL);
  }
}
