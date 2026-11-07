import { cookies } from 'next/headers';
import GiroFornecedoresSimplesView from '@/components/giro/estoque/GiroFornecedoresSimplesView';

// Shell estático — lê só o cookie de filial (sem chamada ao backend).
export default function FornecedoresSimplesPage() {
  const filialAtual = cookies().get('giro_filial')?.value ?? '1';
  return <GiroFornecedoresSimplesView filialAtual={filialAtual} />;
}
