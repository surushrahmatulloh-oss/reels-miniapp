@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Push ба GitHub → Render

echo ========================================
echo   Push ислоҳот ба Render
echo ========================================
echo.
echo Агар хато дод, VPN ё hotspot-ро фаъол кунед.
echo.

node scripts\deploy-render.mjs

if errorlevel 1 (
  echo.
  echo ХАТО: GitHub пайваст нашуд.
  echo 1. VPN кушоед ё телефонро hotspot кунед
  echo 2. Ин файлро аз нав иҷро кунед
  pause
  exit /b 1
)

echo.
echo ✓ Push муваффақ! Render 5 дақиқа deploy мекунад.
echo Баъд Telegram-ро пурра пӯшед ва аз нав кушоед.
pause
