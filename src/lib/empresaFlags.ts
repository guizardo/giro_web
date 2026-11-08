import 'server-only';
import { cookies } from 'next/headers';

// Flags por empresa definidas no portal admin (giro360_admin) e lidas no login via
// GET /giro/empresa-config. Ficam gravadas no cookie httpOnly giro_auth pelo tempo
// da sessão (8h): mudança no portal vale a partir do próximo login.

// Simulador da Reforma: libera as telas Simulador CBS 2027 e Fornecedores do Simples.
export function simuladorReformaLiberado(): boolean {
  try {
    const raw = cookies().get('giro_auth')?.value;
    if (!raw) return false;
    return JSON.parse(raw).simulador_reforma === true;
  } catch {
    return false;
  }
}
