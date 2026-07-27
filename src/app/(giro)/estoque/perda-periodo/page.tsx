import { cookies } from 'next/headers';
import GiroPerdaPeriodoView from '@/components/giro/estoque/GiroPerdaPeriodoView';

interface SearchParams {
  secao?: string; grupo?: string; curva?: string;
  codigo?: string; data_ini?: string; data_fim?: string;
}

function defaultRange() {
  const fim = new Date();
  const ini = new Date();
  ini.setDate(ini.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { ini: fmt(ini), fim: fmt(fim) };
}

export default function PerdaPeriodoPage({ searchParams }: { searchParams: SearchParams }) {
  const filialAtual = cookies().get('giro_filial')?.value ?? '1';
  const { ini, fim } = defaultRange();
  return (
    <GiroPerdaPeriodoView
      filialAtual={filialAtual}
      secaoAtual={searchParams.secao      ?? ''}
      grupoAtual={searchParams.grupo      ?? ''}
      curvaAtual={searchParams.curva      ?? ''}
      codigoAtual={searchParams.codigo    ?? ''}
      dataIniAtual={searchParams.data_ini ?? ini}
      dataFimAtual={searchParams.data_fim ?? fim}
    />
  );
}
