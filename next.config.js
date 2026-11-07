/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Permite acessar o dev server (assets /_next/*) pela rede local, não só localhost.
  allowedDevOrigins: ['10.1.4.29', '10.1.4.222'],
};

// Desabilita verificação de certificado TLS apenas para backends em rede
// privada (IP local). Conexões externas (domínio público) não são afetadas
// porque este bloco só executa quando o hostname é um IP privado.
try {
  const backendUrl = process.env.BACKEND_URL ?? '';
  if (backendUrl.startsWith('https://')) {
    const { hostname } = new URL(backendUrl);
    const isPrivate = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname);
    if (isPrivate) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }
} catch (_) { /* URL malformada — ignora */ }

module.exports = nextConfig;
