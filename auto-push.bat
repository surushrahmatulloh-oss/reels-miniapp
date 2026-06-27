@echo off
chcp 65001 >nul
cd /d "%~dp0"
node scripts\auto-push.mjs %*
pause
