import { apiFetch } from '@/lib/api';
import { getFilialSelecionada } from '@/lib/filial';
import { GiroOverview } from '@/types/giro';
import EstoqueOverviewView from '@/components/giro/estoque/EstoqueOverviewView';

const empty: GiroOverview = {
  filial: 0, total_produtos: 0,
  curva_a: 0, curva_b: 0, curva_c: 0, curva_d: 0, curva_e: 0,
  StartsAt: '', EndsAt: '',
};

export default async function EstoquePage() {
  const filial = getFilialSelecionada();
  const raw = await apiFetch<GiroOverview>(
    `/api/giro/overview?filial=${filial}`,
  ).catch(() => empty);

  // Backend retorna HTTP 200 com { ERRO: "..." } em caso de erro de aplicação
  const data: GiroOverview = raw.total_produtos !== undefined ? raw : empty;

  return <EstoqueOverviewView data={data} filialLabel={filial === '0' ? 'Consolidado' : `Filial ${filial}`} />;
}
