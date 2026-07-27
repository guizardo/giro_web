import { cookies } from 'next/headers';
import GiroPerdaView from '@/components/giro/estoque/GiroPerdaView';

interface SearchParams {
  secao?: string; grupo?: string; curva?: string;
  codigo?: string; data_ini?: string; data_fim?: string;
}

export default function PerdaPage({ searchParams }: { searchParams: SearchParams }) {
  const filialAtual = cookies().get('giro_filial')?.value ?? '1';
  return (
    <GiroPerdaView
      filialAtual={filialAtual}
      secaoAtual={searchParams.secao    ?? ''}
      grupoAtual={searchParams.grupo    ?? ''}
      curvaAtual={searchParams.curva    ?? ''}
      codigoAtual={searchParams.codigo  ?? ''}
      dataIniAtual={searchParams.data_ini ?? ''}
      dataFimAtual={searchParams.data_fim ?? ''}
    />
  );
}
