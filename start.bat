@echo off
chcp 65001 >nul
title Reels Mini App
cd /d "%~dp0"

echo ========================================
echo   Reels Mini App - Оғоз
echo ========================================

where node >nul 2>&1 || (echo Node.js ёфт нашуд! & pause & exit /b 1)

if not exist "node_modules\" (
  call npm install -g pnpm
  call pnpm install
)

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo Насби cloudflared...
  winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements --disable-interactivity >nul 2>&1
)

echo.
echo Ҳама дар ЯК терминал оғоз мешавад.
echo URL дар поёни экран намоиш дода мешавад.
echo.
echo Дар Telegram: @miniapprealsBot
echo ИН ТЕРМИНАЛРО НАПУШЕД!
echo.
echo Агар 503 биёяд: setup-ngrok.bat иҷро кунед (устувор)
echo ========================================
echo.

node scripts\run-all.mjs
pause
