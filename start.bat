@echo off
chcp 65001 >nul
title Reels Mini App
cd /d "%~dp0"

echo ========================================
echo   Reels Mini App - Оғоз
echo ========================================

where node >nul 2>&1 || (echo Node.js ёфт нашуд! & pause & exit /b 1)

echo Қатъ кардани серверҳои қадим...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

if not exist "node_modules\" (
  call npm install -g pnpm
  call pnpm install
)

echo.
echo Боркунии frontend...
cd apps\frontend
call npx vite build
cd ..\..
echo.

echo Ҳама дар ЯК терминал оғоз мешавад.
echo Дар Telegram: @miniapprealsBot
echo ИН ТЕРМИНАЛРО НАПУШЕД!
echo ========================================
echo.

node scripts\run-all.mjs
pause
 