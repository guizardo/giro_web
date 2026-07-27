// VPS Registry: mapeia CNPJ → URL + credenciais do backend do cliente.
// Esta é a ÚNICA chamada que passa pelo VPS. Todas as outras vão direto ao backend.
//
// Em produção: substituir o objeto `registry` por uma consulta ao banco
// de dados central (ex: Postgres no VPS com tabela clientes).

import { NextResponse } from 'next/server';

interface ClienteConfig {
  url:  string;  // URL pública do backend via Cloudflare Tunnel
  user: string;  // usuário da API Delphi (MVCFramework Basic Auth)
  pass: string;  // senha da API Delphi
}

// ─── REGISTRY: adicionar um registro por cliente ───────────────────────────
const registry: Record<string, ClienteConfig> = {
  // '12345678000100': {
  //   url:  'https://cliente1.cfargotunnel.com',
  //   user: 'usuario_api',
  //   pass: 'senha_api',
  // },
};
// ───────────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cnpj = (searchParams.get('cnpj') ?? '').replace(/\D/g, '');

  if (cnpj.length < 11) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 });
  }

  const entry = registry[cnpj];
  if (!entry) {
    return NextResponse.json({ error: 'CNPJ não localizado' }, { status: 404 });
  }

  return NextResponse.json(entry);
}
