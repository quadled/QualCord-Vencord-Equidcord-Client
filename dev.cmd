@echo off
cd /d "%~dp0"
echo [Qualcord] Starte Watch-Modus (Automatisches Neukompilieren bei Dateiänderungen)...
echo Sobald du eine Datei im userplugins-Ordner speicherst, wird sie sofort neu gebaut.
echo Druecke in Discord danach einfach Strg + R zum Neuladen!
echo.
call pnpm.cmd watch
pause
