# giro_web — Frontend Next.js 14

## Visão geral
Dashboard de análise de giro de estoque (Giro 360°). Consome a API REST do Delphi MVC_LOGIDOC via JWT. Hospedado como app Next.js 14 com App Router.

## Stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS v3 — **HSL variables, NÃO oklch / Tailwind v4**
- shadcn/ui (button, badge, card, input, select, table, dialog, separator, label, sonner, skeleton)
- Lucide React (ícones)
- Node 18 / npm 10
- Dev: `npm run dev` → porta **3002**
- Produção: serviço Windows (NSSM, `instalar_servico_web.ps1`) → porta **3000**, `NODE_ENV=production`, logs em `C:\logidoc\giro_web.log`

## Variáveis de ambiente (`.env.local`)
```
BACKEND_URL=http://10.1.4.29:8082      # fallback server-side (sem empresa no cookie)
BACKEND_USER=logidoc_api               # NÃO USADO diretamente — credenciais ficam no VPS
BACKEND_PASS=...                       # idem
FILIAL=1

VPS_URL=https://api-giro.logidoc.pro          # server-side (apiToken.ts)
NEXT_PUBLIC_VPS_URL=https://api-giro.logidoc.pro  # client-side (discovery.ts, registro)
```

## Estrutura de pastas relevante
```
src/
  app/
    layout.tsx                  — root layout
    page.tsx                    — redirect para /(giro)/estoque
    (giro)/
      layout.tsx                — sidebar + autenticação (middleware redireciona /login se sem cookie)
      estoque/
        page.tsx                — overview de giro (Server Component)
        parados/page.tsx        — produtos parados
        ruptura/page.tsx        — risco de ruptura
        perda/page.tsx          — perda desconhecida
    login/
      page.tsx                  — formulário de login (Client Component)
      actions.ts                — Server Action: login em 2 passos
    registro/page.tsx           — registro de nova empresa
    confirmacao/page.tsx        — confirmação de e-mail
    api/resolve/route.ts        — proxy Route Handler para o VPS /resolve
    filial/actions.ts           — Server Action: troca de filial (cookie giro_filial)
    debug/page.tsx              — página de debug/testes locais (não linkada na sidebar)
  components/
    giro/
      BackendGate.tsx           — Client Component: estado pendente/bloqueado/aprovado
      estoque/
        EstoqueOverviewView.tsx
        GiroParadosView.tsx
        GiroRupturaView.tsx
        GiroPerdaView.tsx
      sidebar/
        SidebarShell.tsx / NavLinks.tsx / FilialSelect.tsx / LogoutButton.tsx / MobileHeader.tsx
    ui/                         — shadcn components
  hooks/
    useGiroFetch.ts             — fetch client-side com token do cookie
  lib/
    api.ts          — apiFetch (server-only): lê cookie giro_auth, chama getApiToken
    apiToken.ts     — server-only: cache de JWT via VPS /giro/token
    apiFetchClient.ts — fetch client-side
    discovery.ts    — client-side: localStorage config, checkDevice, registerAndResolve
    empresas.ts     — busca lista de empresas no VPS
    filial.ts       — helpers de filial
    utils.ts        — cn() shadcn
  middleware.ts     — protege rotas /(giro)/* exigindo cookie giro_auth
  types/
    giro.ts         — GiroOverview, GiroParadosResponse, GiroRupturaResponse, GiroPerdaResponse, CURVA_GIRO
```

## Fluxo de autenticação (duplo)
1. **Registro/dispositivo** (BackendGate, client-side)
   - `discovery.ts` → `GET VPS /resolve?cnpj=X&device_id=Y`
   - device_id persistido em localStorage (`giro_device_id`)
   - Config salva em localStorage (`giro_backend_v1`)
2. **Login do operador** (Server Action `login` em `actions.ts`)
   - Chama `getApiToken(backendUrl, cnpj)` → VPS `/giro/token` → JWT de aplicação (7h cache)
   - POST `/api/giro/auth/login` com Bearer token → retorna userJWT (8h, vinculado a device_id)
   - Cookie `giro_auth` (httpOnly): `{ backendUrl, cnpj, codigo, nome, tipo, device_id, token }`
   - Cookie `giro_user` (legível no cliente): `{ codigo, nome, tipo }`

## Regra crítica: server vs. client
- `apiFetch` e `getApiToken` são **server-only** — nunca importar em Client Components
- Client Components usam `apiFetchClient.ts` ou `useGiroFetch.ts` com o token do cookie

## Endpoints Delphi consumidos
| Endpoint | Descrição |
|---|---|
| `GET /api/auth/token` | JWT de aplicação (Basic Auth) — chamado via VPS |
| `POST /api/giro/auth/login` | Login do operador |
| `GET /api/giro/filiais` | Lista de filiais |
| `GET /api/giro/overview?filial=N` | Painel de curvas A-E |
| `GET /api/giro/parados?filial=N` | Produtos parados (curva D+E) |
| `GET /api/giro/ruptura?filial=N` | Risco de ruptura (curva A+B) |
| `GET /api/giro/perda?filial=N` | Perda desconhecida |
| `POST /api/giro/processar?filial=N` | Dispara PRC_ROTINA_DIARIA_GIRO (endpoint existe na API Delphi, mas **não é chamado atualmente pelo frontend** — verificar se ainda está em uso) |

## Curva de giro (CURVA_GIRO em types/giro.ts)
A=Campeão (≥70%), B=Regular (≥30%), C=Sazonal (≥10%), D=Encalhado (≥1%), E=Inativo (<1%)

## Projetos relacionados
- Backend VPS: `E:\react\giro360_backend\` — `/giro/token`, `/resolve`, aprovação de devices
- API Delphi: `E:\delphi_programas\MVC_LOGIDOC\` — fonte dos dados
- Admin portal: `E:\react\giro360_admin\` — aprovação de dispositivos pela LogicBox
