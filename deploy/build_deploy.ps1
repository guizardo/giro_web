# build_deploy.ps1
# Gera o pacote de deploy do Giro 360 Web (Next.js standalone).
# Execute no ambiente de desenvolvimento antes de levar para o cliente.
#
# Pre-requisitos: Node.js instalado, dependencias ja instaladas (npm ci)
# Uso: powershell -ExecutionPolicy Bypass -File build_deploy.ps1

$raiz   = Split-Path $PSScriptRoot   # pasta raiz do projeto Next.js
$dist   = "$raiz\dist_deploy"        # pasta de saida

Write-Host "=== Giro 360 Web - Build de Deploy ===" -ForegroundColor Cyan
Set-Location $raiz

# 1. Instalar dependencias
Write-Host "`n[1/4] Instalando dependencias..." -ForegroundColor Yellow
npm ci --prefer-offline
if ($LASTEXITCODE -ne 0) { Write-Error "npm ci falhou"; exit 1 }

# 2. Build standalone
Write-Host "`n[2/4] Gerando build standalone..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "next build falhou"; exit 1 }

# 3. Montar pasta de deploy
Write-Host "`n[3/4] Montando pacote em $dist ..." -ForegroundColor Yellow
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Force $dist | Out-Null

# Copiar standalone (servidor + dependencias embutidas)
Copy-Item ".next\standalone\*" $dist -Recurse -Force

# Assets estáticos (obrigatorio — não vem no standalone)
Copy-Item ".next\static"  "$dist\.next\static"  -Recurse -Force
Copy-Item "public"        "$dist\public"         -Recurse -Force

# Arquivo .env de producao (ajustar BACKEND_URL no cliente)
if (Test-Path ".env.production") {
    Copy-Item ".env.production" "$dist\.env.production"
}

# 4. Zipar
Write-Host "`n[4/4] Compactando..." -ForegroundColor Yellow
$zip = "$raiz\giro_web_deploy_$(Get-Date -f 'yyyyMMdd_HHmm').zip"
Compress-Archive -Path "$dist\*" -DestinationPath $zip -Force
Write-Host "ZIP gerado: $zip" -ForegroundColor Green

Write-Host "`n=== Deploy pronto ===" -ForegroundColor Cyan
Write-Host "Copie o ZIP para o cliente e siga o README_DEPLOY.txt"
