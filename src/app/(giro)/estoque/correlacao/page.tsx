import { cookies } from 'next/headers';
import GiroCorrelacaoView from '@/components/giro/estoque/GiroCorrelacaoView';

interface SearchParams { limit_correlato?: string }

// Shell estático — lê só o cookie de filial (sem chamada ao backend).
// Dados buscados client-side pela View via useGiroInfiniteList (browser → backend direto).
export default function CorrelacaoPage({ searchParams }: { searchParams: SearchParams }) {
  const filialAtual = cookies().get('giro_filial')?.value ?? '1';
  return (
    <GiroCorrelacaoView
      filialAtual={filialAtual}
      limitCorrelatoAtual={searchParams.limit_correlato ?? '5'}
    />
  );
}
