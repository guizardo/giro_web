import { cookies } from 'next/headers';
import GiroSimuladorCBSView from '@/components/giro/estoque/GiroSimuladorCBSView';
import SimuladorReformaBloqueado from '@/components/giro/SimuladorReformaBloqueado';
import { simuladorReformaLiberado } from '@/lib/empresaFlags';

// Shell estático — lê só o cookie de filial (sem chamada ao backend).
// Dados buscados client-side pela View via useGiroInfiniteList (browser → backend direto).
// Liberado por empresa no portal admin (Simulador Reforma).
export default function SimuladorCBSPage() {
  if (!simuladorReformaLiberado()) return <SimuladorReformaBloqueado />;
  const filialAtual = cookies().get('giro_filial')?.value ?? '1';
  return <GiroSimuladorCBSView filialAtual={filialAtual} />;
}
