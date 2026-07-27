'use client';

export const EMPRESAS_KEY = 'giro_empresas_v1';
export const SESSAO_KEY   = 'giro_sessao_ativa_v1';

// Identidade da empresa/usuário neste dispositivo — nenhum segredo aqui.
// A senha nunca é persistida; cada login pede a senha de novo e troca por um JWT curto.
export interface EmpresaConfig {
  cnpj:        string;
  codigo:      number;
  nome?:       string;
  backend_url: string;
  device_id:   string;
  salvo_em:    string;
}

// Sessão ativa — userJWT emitido por PostGiroLogin, vinculado ao device_id (8h).
export interface SessaoAtiva {
  cnpj:        string;
  codigo:      number;
  nome?:       string;
  backend_url: string;
  device_id:   string;   // enviado como X-Device-Id em todo request
  token:       string;   // "Bearer <userJWT>" — claim device_id no payload
  expira_em:   string;   // ISO date
}

export function getEmpresas(): EmpresaConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(EMPRESAS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function salvarEmpresa(cfg: EmpresaConfig) {
  const lista = getEmpresas().filter(
    e => !(e.cnpj === cfg.cnpj && e.codigo === cfg.codigo && e.device_id === cfg.device_id)
  );
  lista.push(cfg);
  localStorage.setItem(EMPRESAS_KEY, JSON.stringify(lista));
}

export function removerEmpresa(cnpj: string, codigo: number) {
  const lista = getEmpresas().filter(e => !(e.cnpj === cnpj && e.codigo === codigo));
  localStorage.setItem(EMPRESAS_KEY, JSON.stringify(lista));
  const sessao = getSessaoAtiva();
  if (sessao && sessao.cnpj === cnpj && sessao.codigo === codigo) {
    clearSessaoAtiva();
  }
}

export function getSessaoAtiva(): SessaoAtiva | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSAO_KEY);
    if (!raw) return null;
    const sessao: SessaoAtiva = JSON.parse(raw);
    if (new Date(sessao.expira_em).getTime() <= Date.now()) {
      clearSessaoAtiva();
      return null;
    }
    return sessao;
  } catch {
    return null;
  }
}

export function setSessaoAtiva(sessao: SessaoAtiva) {
  localStorage.setItem(SESSAO_KEY, JSON.stringify(sessao));
}

export function clearSessaoAtiva() {
  if (typeof window !== 'undefined') localStorage.removeItem(SESSAO_KEY);
}

export function fmtCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
