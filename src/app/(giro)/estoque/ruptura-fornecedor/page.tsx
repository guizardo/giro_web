import { cookies } from 'next/headers';
import GiroRupturaFornecedorView from '@/components/giro/estoque/GiroRupturaFornecedorView';

interface SearchParams {
  fornecedor?: string; for_filial?: string; nome_for?: string;
  secao?: string; grupo?: string; curva?: string;
  codigo?: string; data_ini?: string; data_fim?: string;
  inc_negativo?: string;
}

export default function RupturaFornecedorPage({ searchParams }: { searchParams: SearchParams }) {
  const filialAtual = cookies().get('giro_filial')?.value ?? '1';
  return (
    <GiroRupturaFornecedorView
      filialAtual={filialAtual}
      fornecedorAtual={searchParams.fornecedor ?? ''}
      forFilialAtual={searchParams.for_filial  ?? ''}
      nomeForAtual={searchParams.nome_for      ?? ''}
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
