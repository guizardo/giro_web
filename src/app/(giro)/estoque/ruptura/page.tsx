import { cookies } from 'next/headers';
import GiroRupturaView from '@/components/giro/estoque/GiroRupturaView';

interface SearchParams {
  secao?: string; grupo?: string; curva?: string;
  codigo?: string; data_ini?: string; data_fim?: string;
  inc_negativo?: string;
}

export default function RupturaPage({ searchParams }: { searchParams: SearchParams }) {
  const filialAtual = cookies().get('giro_filial')?.value ?? '1';
  return (
    <GiroRupturaView
      filialAtual={filialAtual}
      secaoAtual={searchParams.secao      ?? ''}
      grupoAtual={searchParams.grupo      ?? ''}
      curvaAtual={searchParams.curva      ?? ''}
      codigoAtual={searchParams.codigo    ?? ''}
      dataIniAtual={searchParams.data_ini ?? ''}
      dataFimAtual={searchParams.data_fim ?? ''}
      incNegativo={searchParams.inc_negativo === '1'}
    />
  );
}
