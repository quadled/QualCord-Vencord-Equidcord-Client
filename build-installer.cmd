@echo off
setlocal
cd /d "%~dp0"

echo ====================================================
echo         ⚡ Qualcord Client ^& Installer Build
echo ====================================================
echo.

echo [1/3] Kompiliere Qualcord Client...
call pnpm build
if errorlevel 1 (
    echo [FEHLER] Qualcord Build fehlgeschlagen!
    exit /b %errorlevel%
)

echo.
echo [2/3] Erstelle Qualcord-dist.zip Archiv...
if not exist "installer" mkdir "installer"
powershell -NoProfile -Command "Compress-Archive -Path 'dist\desktop\package.json','dist\desktop\patcher.js','dist\desktop\preload.js','dist\desktop\renderer.css','dist\desktop\renderer.js' -DestinationPath 'installer\Qualcord-dist.zip' -Force"
if errorlevel 1 (
    echo [FEHLER] Erstellung von Qualcord-dist.zip fehlgeschlagen!
    exit /b %errorlevel%
)

echo.
echo [3/3] Kompiliere QualcordInstaller.exe (C# Standalone)...
"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:winexe /optimize+ /r:System.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll /resource:installer\Qualcord-dist.zip,QualcordDistZip /out:installer\QualcordInstaller.exe installer\QualcordInstaller.cs
if errorlevel 1 (
    echo [FEHLER] C# Kompilierung von QualcordInstaller.exe fehlgeschlagen!
    exit /b %errorlevel%
)

echo.
echo ====================================================
echo  ✅ ERFOLG: QualcordInstaller.exe wurde erstellt!
echo  Pfad: installer\QualcordInstaller.exe
echo ====================================================
