import { cookies } from 'next/headers';
import GiroSimuladorCBSView from '@/components/giro/estoque/GiroSimuladorCBSView';

// Shell estático — lê só o cookie de filial (sem chamada ao backend).
// Dados buscados client-side pela View via useGiroInfiniteList (browser → backend direto).
export default function SimuladorCBSPage() {
  const filialAtual = cookies().get('giro_filial')?.value ?? '1';
  return <GiroSimuladorCBSView filialAtual={filialAtual} />;
}
