import { cookies } from 'next/headers';
import GiroParadosView from '@/components/giro/estoque/GiroParadosView';

interface SearchParams {
  secao?: string; grupo?: string; curva?: string;
  codigo?: string; data_ini?: string; data_fim?: string;
  min_dias?: string;
}

// Shell estático — lê só o cookie de filial (sem chamada ao backend).
// Dados buscados client-side pela View via useGiroFetch (browser → backend direto).
export default function ParadosPage({ searchParams }: { searchParams: SearchParams }) {
  const filialAtual = cookies().get('giro_filial')?.value ?? '1';
  return (
    <GiroParadosView
      filialAtual={filialAtual}
      secaoAtual={searchParams.secao    ?? ''}
      grupoAtual={searchParams.grupo    ?? ''}
      curvaAtual={searchParams.curva    ?? ''}
      codigoAtual={searchParams.codigo  ?? ''}
      dataIniAtual={searchParams.data_ini ?? ''}
      dataFimAtual={searchParams.data_fim ?? ''}
      minDiasAtual={searchParams.min_dias ?? ''}
    />
  );
}
