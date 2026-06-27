@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Push → GitHub → Render

echo ========================================
echo   Push ислоҳот ба Render
echo ========================================
echo.

if not exist ".env.deploy" (
  echo .env.deploy нест!
  if exist ".env.deploy.example" copy /Y .env.deploy.example .env.deploy >nul
  echo GITHUB_TOKEN=ghp_... дар .env.deploy гузоред
  notepad .env.deploy
  pause
  exit /b 1
)

node scripts\push-github.mjs
if errorlevel 1 (
  echo.
  echo ХАТО: GitHub пайваст нашуд.
  echo 1. VPN ё hotspot фаъол кунед
  echo 2. GITHUB_TOKEN дар .env.deploy санҷед
  echo 3. Аз нав иҷро кунед
  pause
  exit /b 1
)

echo.
echo ✓ Push муваффақ!
echo 5-7 дақиқа интизор шавед, баъд Telegram пурра пӯшед.
pause
