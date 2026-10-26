@echo off
setlocal
cd /d "%~dp0"

echo ====================================================
echo         ⚡ Qualcord Client ^& Installer Build
echo ====================================================
echo.

echo [1/3] Kompiliere Qualcord Client...
call pnpm.cmd build
if errorlevel 1 (
    echo [FEHLER] Qualcord Build fehlgeschlagen!
    exit /b %errorlevel%
)

echo.
echo [2/3] Erstelle Qualcord-dist.zip Archiv...
if not exist "installer" mkdir "installer"
powershell -NoProfile -Command "Compress-Archive -Path 'dist\desktop\package.json','dist\desktop\patcher.js','dist\desktop\preload.js','dist\desktop\renderer.css','dist\desktop\renderer.js','version.json' -DestinationPath 'installer\Qualcord-dist.zip' -Force"
if errorlevel 1 (
    echo [FEHLER] Erstellung von Qualcord-dist.zip fehlgeschlagen!
    exit /b %errorlevel%
)

echo.
echo [3/3] Kompiliere modernen QualcordInstaller.exe (WPF .NET)...
if not exist "installer\QualcordSetup\Resources" mkdir "installer\QualcordSetup\Resources"
copy /y installer\Qualcord-dist.zip installer\QualcordSetup\Resources\payload.zip >nul
dotnet publish installer\QualcordSetup\CustomInstaller.csproj -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -o installer\dist
if errorlevel 1 (
    echo [FEHLER] C# Kompilierung von QualcordInstaller.exe fehlgeschlagen!
    exit /b %errorlevel%
)
copy /y installer\dist\QualcordSetup.exe installer\QualcordInstaller.exe >nul

echo.
echo ====================================================
echo  ✅ ERFOLG: QualcordInstaller.exe wurde erstellt!
echo  Pfad: installer\QualcordInstaller.exe
echo ====================================================
