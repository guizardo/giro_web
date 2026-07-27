'use client';

const STORAGE_KEY  = 'giro_backend_v1';
const DEVICE_KEY   = 'giro_device_id';
const VPS_BASE_URL = process.env.NEXT_PUBLIC_VPS_URL || 'http://localhost:3001';

export interface BackendConfig {
  url:        string;   // ex: https://cliente1.cfargotunnel.com
  auth:       string;   // Basic <base64 user:pass>
  cnpj:       string;
  device_id:  string;
}

export function getBackendConfig(): BackendConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearBackendConfig() {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
}

// Retorna ou cria um device_id persistente para este navegador/dispositivo
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export type ResolveStatus = 'aprovado' | 'pendente' | 'bloqueado';

export interface ResolveResult {
  status:       ResolveStatus;
  backend_url?: string;
  mensagem?:    string;
  cnpj?:        string;
}

// Consulta o VPS se o dispositivo está aprovado para o CNPJ
export async function checkDevice(cnpj: string, device_id: string): Promise<ResolveResult> {
  const digits = cnpj.replace(/\D/g, '');
  const res = await fetch(
    `${VPS_BASE_URL}/resolve?cnpj=${digits}&device_id=${device_id}`,
    { method: 'GET' }
  );
  const data = await res.json();
  if (res.status === 202) return { status: 'pendente', mensagem: data.mensagem };
  if (res.status === 403) return { status: 'bloqueado', mensagem: data.erro };
  if (!res.ok) throw new Error(data.erro || 'Erro ao verificar dispositivo.');
  return { status: 'aprovado', backend_url: data.backend_url, cnpj: data.cnpj };
}

// Registra o device e salva a config local quando aprovado
export async function registerAndResolve(
  cnpj: string,
  usuario: string,
  senha: string,
  device_id: string
): Promise<ResolveResult> {
  const result = await checkDevice(cnpj, device_id);

  if (result.status === 'aprovado' && result.backend_url) {
    const config: BackendConfig = {
      url:       result.backend_url.replace(/\/$/, ''),
      auth:      `Basic ${btoa(`${usuario}:${senha}`)}`,
      cnpj:      cnpj.replace(/\D/g, ''),
      device_id,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  return result;
}
