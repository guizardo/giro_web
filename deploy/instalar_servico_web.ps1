# instalar_servico_web.ps1
# Execute UMA VEZ como Administrador no servidor do cliente.
# Pre-requisitos:
#   1. Node.js LTS instalado (https://nodejs.org)
#   2. NSSM baixado em C:\logidoc\nssm.exe  (https://nssm.cc/download)
#   3. Conteudo do ZIP do deploy extraido em C:\logidoc\giro_web\

$nssm    = "C:\logidoc\nssm.exe"           # <-- caminho do nssm.exe
$appDir  = "C:\logidoc\giro_web"           # <-- onde o ZIP foi extraido
$node    = (Get-Command node -ErrorAction SilentlyContinue)?.Source
$svcName = "GiroWeb"
$porta   = "3000"

if (-not $node) {
    Write-Error "Node.js nao encontrado. Instale em https://nodejs.org e reinicie o terminal."
    exit 1
}
if (-not (Test-Path $nssm)) {
    Write-Error "NSSM nao encontrado em $nssm. Baixe em https://nssm.cc/download"
    exit 1
}
if (-not (Test-Path "$appDir\server.js")) {
    Write-Error "server.js nao encontrado em $appDir. Extraia o ZIP de deploy primeiro."
    exit 1
}

Write-Host "Instalando servico '$svcName'..." -ForegroundColor Cyan

& $nssm install $svcName $node
& $nssm set $svcName AppDirectory    $appDir
& $nssm set $svcName AppParameters  "server.js"
& $nssm set $svcName AppEnvironmentExtra `
    "PORT=$porta" `
    "NODE_ENV=production" `
    "HOSTNAME=0.0.0.0"
& $nssm set $svcName DisplayName    "Giro 360 Web"
& $nssm set $svcName Description    "Frontend Next.js do Giro 360 - Logidoc"
& $nssm set $svcName Start          SERVICE_AUTO_START
& $nssm set $svcName AppStdout      "C:\logidoc\giro_web.log"
& $nssm set $svcName AppStderr      "C:\logidoc\giro_web_err.log"
& $nssm set $svcName AppRotateFiles 1
& $nssm set $svcName AppRotateBytes 5000000   # 5 MB por arquivo de log

& $nssm start $svcName

Write-Host ""
Write-Host "Servico '$svcName' instalado e iniciado na porta $porta." -ForegroundColor Green
Write-Host "Acesse: http://localhost:$porta"
Write-Host ""
Write-Host "Comandos uteis:"
Write-Host "  Parar:     nssm stop $svcName"
Write-Host "  Reiniciar: nssm restart $svcName"
Write-Host "  Remover:   nssm remove $svcName confirm"
