@echo off
cd /d "%~dp0"
echo ========================================================
echo [Qualcord] Entferne Qualcord aus Discord...
echo ========================================================
node scripts/runInstaller.mjs -- --uninstall
echo.
pause
