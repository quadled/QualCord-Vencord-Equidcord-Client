@echo off
cd /d "%~dp0"
echo ========================================================
echo [Qualcord] Pushe Repository zu GitHub...
echo Ziel: https://github.com/quadled/QualCord-Vencord-Equidcord-Client
echo ========================================================
git push -u origin main
echo.
echo Fertig!
pause
