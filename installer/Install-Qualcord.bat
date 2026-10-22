@echo off
setlocal
title Qualcord 1-Klick Installer
cd /d "%~dp0"

echo ====================================================
echo           ⚡ Qualcord Client 1-Klick Installer
echo ====================================================
echo.

if exist "QualcordInstaller.exe" (
    echo Starte Qualcord Installer...
    start "" "QualcordInstaller.exe"
    exit /b 0
)

echo QualcordInstaller.exe nicht gefunden. Lade herunter...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://raw.githubusercontent.com/quadled/QualCord-Vencord-Equidcord-Client/main/installer/QualcordInstaller.exe', 'QualcordInstaller.exe'); start 'QualcordInstaller.exe'"

exit /b 0
