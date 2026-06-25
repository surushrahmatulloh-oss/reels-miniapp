@echo off
chcp 65001 >nul
title Қатъ кардан
cd /d "%~dp0"
echo Қатъ кардани ҳамаи серверҳо...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo Тайёр. Ҳоло start.bat-ро иҷро кунед.
pause
