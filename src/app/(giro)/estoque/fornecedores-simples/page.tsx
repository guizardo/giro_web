import { cookies } from 'next/headers';
import GiroFornecedoresSimplesView from '@/components/giro/estoque/GiroFornecedoresSimplesView';
import SimuladorReformaBloqueado from '@/components/giro/SimuladorReformaBloqueado';
import { simuladorReformaLiberado } from '@/lib/empresaFlags';

// Shell estático — lê só o cookie de filial (sem chamada ao backend).
// Liberado por empresa no portal admin (Simulador Reforma).
export default function FornecedoresSimplesPage() {
  if (!simuladorReformaLiberado()) return <SimuladorReformaBloqueado />;
  const filialAtual = cookies().get('giro_filial')?.value ?? '1';
  return <GiroFornecedoresSimplesView filialAtual={filialAtual} />;
}
