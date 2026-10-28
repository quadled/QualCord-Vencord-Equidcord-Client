# Qualcord 1-Click Uninstaller for PowerShell
# Aufruf im PowerShell Terminal:
# irm https://raw.githubusercontent.com/quadled/QualCord-Vencord-Equidcord-Client/main/installer/uninstall.ps1 | iex

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "====================================================" -ForegroundColor Magenta
Write-Host "         ⚡ Qualcord Client Deinstallation" -ForegroundColor Red
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
            break
        }
    }
}

if (-not $targetBranch) {
    Write-Host "❌ Keine Discord-Installation gefunden!" -ForegroundColor Red
    return
}

Write-Host "-> Schließe laufende Discord Prozesse ($($targetBranch.Proc))..." -ForegroundColor Yellow
Get-Process -Name $targetBranch.Proc -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800

Write-Host "-> Stelle originale Discord-Dateien wieder her..." -ForegroundColor Yellow
$allAppDirs = Get-ChildItem -Path $targetBranch.Path -Directory -Filter "app-*"
$restored = $false

foreach ($ad in $allAppDirs) {
    $res = Join-Path $ad.FullName "resources"
    $asar = Join-Path $res "app.asar"
    $orig = Join-Path $res "_app.asar"

    if (Test-Path $orig) {
        if (Test-Path $asar) {
            Remove-Item -Path $asar -Recurse -Force -ErrorAction SilentlyContinue
        }
        Move-Item -Path $orig -Destination $asar -Force
        Write-Host "   Originales app.asar wiederhergestellt in: $($ad.Name)" -ForegroundColor Green
        $restored = $true
    }
}

if ($restored) {
    Write-Host "✅ Discord wurde erfolgreich in den Originalzustand zurückversetzt!" -ForegroundColor Green
} else {
    Write-Host "ℹ️ Es wurde kein Mod-Hook gefunden oder Discord war bereits unberührt." -ForegroundColor Cyan
}

Write-Host "-> Starte Discord neu..." -ForegroundColor Cyan
$updateExe = Join-Path $targetBranch.Path "Update.exe"
if (Test-Path $updateExe) {
    Start-Process $updateExe -ArgumentList "--processStart $($targetBranch.Proc).exe"
}
