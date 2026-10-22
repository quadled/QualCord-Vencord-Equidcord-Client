@echo off
cd /d "%~dp0"
echo ========================================================
echo [Qualcord] Injiziere Qualcord in Discord...
echo ========================================================
node scripts/runInstaller.mjs -- --install
echo.
pause
