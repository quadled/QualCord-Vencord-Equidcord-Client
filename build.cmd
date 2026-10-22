@echo off
cd /d "%~dp0"
echo [Qualcord] Kompiliere Client und alle Plugins...
call pnpm.cmd build
echo.
echo Fertig!
pause
