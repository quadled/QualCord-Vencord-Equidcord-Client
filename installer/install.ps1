param(
    [switch]$Uninstall
)

# Qualcord 1-Click Installer & Uninstaller for PowerShell
# Aufruf im PowerShell Terminal:
# Installation:
# irm https://raw.githubusercontent.com/quadled/QualCord-Vencord-Equidcord-Client/main/installer/install.ps1 | iex
# Deinstallation:
# & ([scriptblock]::Create((irm https://raw.githubusercontent.com/quadled/QualCord-Vencord-Equidcord-Client/main/installer/install.ps1))) -Uninstall

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "====================================================" -ForegroundColor Magenta
if ($Uninstall) {
    Write-Host "         ⚡ Qualcord Client Deinstallation" -ForegroundColor Red
} else {
    Write-Host "         ⚡ Qualcord Client 1-Klick Installer" -ForegroundColor Cyan
}
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

# 0. Git pruefen & automatisch installieren falls fehlend
function Test-GitInstalled {
    if (Get-Command git -ErrorAction SilentlyContinue) { return $true }
    $knownGitPaths = @(
        "C:\Program Files\Git\cmd\git.exe",
        "C:\Program Files\Git\bin\git.exe",
        "C:\Program Files (x86)\Git\cmd\git.exe",
        (Join-Path $env:LOCALAPPDATA "Programs\Git\cmd\git.exe")
    )
    foreach ($p in $knownGitPaths) {
        if (Test-Path $p) { return $true }
    }
    return $false
}

if (-not (Test-GitInstalled)) {
    Write-Host "-> Git fuer Windows nicht gefunden. Installiere automatisch..." -ForegroundColor Cyan
    $winget = (Get-Command winget.exe -ErrorAction SilentlyContinue)
    $installed = $false
    if ($winget) {
        try {
            Write-Host "   (Verwende winget...)" -ForegroundColor Gray
            Start-Process winget -ArgumentList "install --id Git.Git -e --source winget --silent --accept-source-agreements --accept-package-agreements" -Wait -NoNewWindow
            if (Test-GitInstalled) { $installed = $true }
        } catch {}
    }
    if (-not $installed) {
        try {
            Write-Host "   (Lade offiziellen Git Installer herunter...)" -ForegroundColor Gray
            $gitInstallerPath = Join-Path $env:TEMP "Git-Installer.exe"
            Invoke-WebRequest -Uri "https://github.com/git-for-windows/git/releases/latest/download/Git-64-bit.exe" -OutFile $gitInstallerPath -UseBasicParsing
            Write-Host "   (Installiere Git stillschweigend...)" -ForegroundColor Gray
            Start-Process $gitInstallerPath -ArgumentList "/VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /SUPPRESSMSGBOXES" -Wait
            Remove-Item $gitInstallerPath -Force -ErrorAction SilentlyContinue
        } catch {}
    }
    if (Test-GitInstalled) {
        Write-Host "✅ Git wurde erfolgreich installiert!" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Git-Installation uebersprungen. Qualcord funktioniert dank HTTP-Fallback trotzdem!" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ Git ist bereits installiert." -ForegroundColor Green
}

# 1. Discord beenden falls offen
Write-Host "-> Schließe laufende Discord Prozesse..." -ForegroundColor Yellow
Get-Process -Name $targetBranch.Proc -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800

# Falls Deinstallation gewünscht ist:
if ($Uninstall) {
    Write-Host "-> Entferne Qualcord Injection..." -ForegroundColor Yellow
    $allAppDirs = Get-ChildItem -Path $targetBranch.Path -Directory -Filter "app-*"
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
        }
    }

    Write-Host "✅ Qualcord wurde erfolgreich deinstalliert und Discord wiederhergestellt!" -ForegroundColor Green

    # Discord neu starten
    $updateExe = Join-Path $targetBranch.Path "Update.exe"
    if (Test-Path $updateExe) {
        Start-Process $updateExe -ArgumentList "--processStart $($targetBranch.Proc).exe"
    }
    return
}

# 2. Qualcord Verzeichnis einrichten
$qualcordDir = Join-Path $localAppData "Qualcord\dist"
if (-not (Test-Path $qualcordDir)) {
    New-Item -ItemType Directory -Path $qualcordDir -Force | Out-Null
}

$localScriptZip = if ($PSScriptRoot) { Join-Path $PSScriptRoot "Qualcord-dist.zip" } else { $null }
$tempZip = Join-Path $env:TEMP "qualcord_installer_$([Guid]::NewGuid().ToString('N')).zip"
$downloadUrl = "https://raw.githubusercontent.com/quadled/QualCord-Vencord-Equidcord-Client/main/installer/Qualcord-dist.zip"

if ($localScriptZip -and (Test-Path $localScriptZip)) {
    Write-Host "-> Verwende lokales Qualcord Archiv..." -ForegroundColor Cyan
    Expand-Archive -Path $localScriptZip -DestinationPath $qualcordDir -Force
} else {
    Write-Host "-> Lade neueste Qualcord-Dateien von GitHub herunter..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempZip -UseBasicParsing -TimeoutSec 30
        Expand-Archive -Path $tempZip -DestinationPath $qualcordDir -Force
    } catch {
        Write-Host "⚠️ Download mit Invoke-WebRequest fehlgeschlagen, versuche Fallback..." -ForegroundColor Yellow
        try {
            $wc = New-Object System.Net.WebClient
            $wc.DownloadFile($downloadUrl, $tempZip)
            Expand-Archive -Path $tempZip -DestinationPath $qualcordDir -Force
        } catch {
            Write-Host "❌ Fehler beim Herunterladen des Qualcord-Archivs: $_" -ForegroundColor Red
        }
    } finally {
        if (Test-Path $tempZip) {
            Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
        }
    }
}

$patcherJs = Join-Path $qualcordDir "patcher.js"
if (-not (Test-Path $patcherJs)) {
    Write-Host "❌ Fehler: 'patcher.js' wurde in '$qualcordDir' nicht gefunden!" -ForegroundColor Red
    Write-Host "   Entpacken oder Download von Qualcord ist fehlgeschlagen." -ForegroundColor Red
    Write-Host "   Discord wurde zum Schutz NICHT verändert, damit Discord weiterhin startet." -ForegroundColor Yellow
    Write-Host "   Bitte überprüfe deine Internetverbindung oder deinen Virenscanner." -ForegroundColor Yellow
    return
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

$patcherJsEscaped = $patcherJs.Replace("\", "\\")
$indexJsLines = @(
    'const fs = require("fs");',
    'const path = require("path");',
    '',
    "const patcher = `"$patcherJsEscaped`";",
    '',
    'if (fs.existsSync(patcher)) {',
    '    try {',
    '        require(patcher);',
    '    } catch (err) {',
    '        console.error("[Qualcord] Fehler beim Laden des Patchers, starte originales Discord:", err);',
    '        const originalAsar = path.join(__dirname, "..", "_app.asar");',
    '        if (fs.existsSync(originalAsar)) {',
    '            require(originalAsar);',
    '        } else {',
    '            throw err;',
    '        }',
    '    }',
    '} else {',
    '    console.warn("[Qualcord] Patcher nicht gefunden unter " + patcher + ", starte originales Discord.");',
    '    const originalAsar = path.join(__dirname, "..", "_app.asar");',
    '    if (fs.existsSync(originalAsar)) {',
    '        require(originalAsar);',
    '    } else {',
    '        throw new Error("[Qualcord] Weder patcher.js noch original _app.asar gefunden!");',
    '    }',
    '}'
)
$indexJs = $indexJsLines -join "`n"
Set-Content -Path (Join-Path $appAsar "index.js") -Value $indexJs -Encoding UTF8

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
Write-Host "🚀 Qualcord ist erfolgreich gestartet! Viel Spaß!" -ForegroundColor Magenta
