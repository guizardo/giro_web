import { Lock } from 'lucide-react';

// Exibido quando a empresa não tem o Simulador da Reforma habilitado no portal
// admin (empresas.simulador_reforma) e o usuário abre a tela pela URL.
export default function SimuladorReformaBloqueado() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="text-lg font-semibold">Simulador da Reforma não habilitado</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        O Simulador CBS 2027 e a análise de Fornecedores do Simples não estão liberados para esta empresa.
        Fale com a LogicBox para habilitar. Depois de liberado, saia e entre de novo no Giro 360.
      </p>
    </div>
  );
}
