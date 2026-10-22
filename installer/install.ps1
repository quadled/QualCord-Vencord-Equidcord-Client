# Qualcord 1-Click Installer for PowerShell
# Aufruf im PowerShell Terminal:
# irm https://raw.githubusercontent.com/quadled/QualCord-Vencord-Equidcord-Client/main/installer/install.ps1 | iex

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "====================================================" -ForegroundColor Magenta
Write-Host "         ⚡ Qualcord Client 1-Klick Installer" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Magenta
Write-Host ""

$localAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
$discordPaths = @(
    @{ Name = "Discord"; Path = Join-Path $localAppData "Discord"; Proc = "Discord" },
    @{ Name = "Discord PTB"; Path = Join-Path $localAppData "DiscordPTB"; Proc = "DiscordPTB" },
    @{ Name = "Discord Canary"; Path = Join-Path $localAppData "DiscordCanary"; Proc = "DiscordCanary" }
)

$targetBranch = $null
foreach ($branch in $discordPaths) {
    if (Test-Path $branch.Path) {
        $appDirs = Get-ChildItem -Path $branch.Path -Directory -Filter "app-*" | Sort-Object Name
        if ($appDirs.Count -gt 0) {
            $targetBranch = $branch
            $latestAppDir = $appDirs[-1].FullName
            break
        }
    }
}

if (-not $targetBranch) {
    Write-Host "❌ Keine untersttzte Discord-Installation gefunden!" -ForegroundColor Red
    return
}

Write-Host "-> Gefundene Discord-Installation: $($targetBranch.Name) ($([System.IO.Path]::GetFileName($latestAppDir)))" -ForegroundColor Green

# 1. Discord beenden falls offen
Write-Host "-> Schliee laufende Discord Prozesse..." -ForegroundColor Yellow
Get-Process -Name $targetBranch.Proc -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800

# 2. Qualcord Verzeichnis einrichten
$qualcordDir = Join-Path $localAppData "Qualcord\dist"
if (-not (Test-Path $qualcordDir)) {
    New-Item -ItemType Directory -Path $qualcordDir -Force | Out-Null
}

$localScriptZip = Join-Path $PSScriptRoot "Qualcord-dist.zip"
$tempZip = Join-Path $env:TEMP "qualcord_installer_$([Guid]::NewGuid().ToString('N')).zip"

if (Test-Path $localScriptZip) {
    Write-Host "-> Verwende lokales Qualcord Archiv..." -ForegroundColor Cyan
    Expand-Archive -Path $localScriptZip -DestinationPath $qualcordDir -Force
} else {
    Write-Host "-> Lade neueste Qualcord-Dateien von GitHub herunter..." -ForegroundColor Cyan
    $downloadUrl = "https://raw.githubusercontent.com/quadled/QualCord-Vencord-Equidcord-Client/main/installer/Qualcord-dist.zip"
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempZip -UseBasicParsing
    Expand-Archive -Path $tempZip -DestinationPath $qualcordDir -Force
    Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
}

# 3. Discord Injection patchen
$resourcesDir = Join-Path $latestAppDir "resources"
if (-not (Test-Path $resourcesDir)) {
    Write-Host "❌ Resources-Ordner nicht gefunden: $resourcesDir" -ForegroundColor Red
    return
}

$appAsar = Join-Path $resourcesDir "app.asar"
$backupAsar = Join-Path $resourcesDir "_app.asar"

Write-Host "-> Patche Discord Injection..." -ForegroundColor Yellow
if (Test-Path $appAsar -PathType Leaf) {
    if (-not (Test-Path $backupAsar)) {
        Move-Item -Path $appAsar -Destination $backupAsar -Force
    } else {
        Remove-Item -Path $appAsar -Force
    }
}

if (-not (Test-Path $appAsar)) {
    New-Item -ItemType Directory -Path $appAsar -Force | Out-Null
}

$packageJson = '{"name":"discord","main":"index.js"}'
Set-Content -Path (Join-Path $appAsar "package.json") -Value $packageJson -Encoding ASCII

$patcherJsEscaped = (Join-Path $qualcordDir "patcher.js").Replace("\", "\\")
$indexJs = "require(`"$patcherJsEscaped`");`n"
Set-Content -Path (Join-Path $appAsar "index.js") -Value $indexJs -Encoding ASCII

Write-Host "✅ Discord wurde erfolgreich mit Qualcord gepatcht!" -ForegroundColor Green

# 4. Discord neu starten
Write-Host "-> Starte Discord neu..." -ForegroundColor Cyan
$updateExe = Join-Path $targetBranch.Path "Update.exe"
if (Test-Path $updateExe) {
    Start-Process $updateExe -ArgumentList "--processStart $($targetBranch.Proc).exe"
} else {
    $directExe = Join-Path $latestAppDir "$($targetBranch.Proc).exe"
    if (Test-Path $directExe) {
        Start-Process $directExe
    }
}

Write-Host ""
Write-Host "🚀 Qualcord ist erfolgreich gestartet! Viel Spa!" -ForegroundColor Magenta
