@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Deploy → Render.com

echo ========================================
echo   Deploy ба Render (устувор, 24/7)
echo ========================================
echo.
echo ngrok танҳо вақте кор мекунад, ки компютер кушода бошад.
echo Render — ҳамеша онлайн (бе компютери шумо).
echo.

if not exist ".env.deploy" (
  echo Эҷоди .env.deploy...
  copy /Y .env.deploy.example .env.deploy >nul
  echo.
  echo Дар .env.deploy GITHUB_TOKEN гузоред:
  echo   https://github.com/settings/tokens  ^(勾 repo^)
  echo.
  if exist ".env" (
    for /f "tokens=1,* delims==" %%a in ('findstr /B "TELEGRAM_BOT_TOKEN=" .env') do (
      echo TELEGRAM_BOT_TOKEN=%%b>> .env.deploy
    )
  )
  notepad .env.deploy
  echo.
  echo Пас аз нигоҳ доштани token, ин скриптро аз нав иҷро кунед.
  pause
  exit /b 1
)

findstr /B "GITHUB_TOKEN=ghp_" .env.deploy >nul
if errorlevel 1 (
  echo GITHUB_TOKEN дар .env.deploy нодуруст ё холӣ аст!
  notepad .env.deploy
  pause
  exit /b 1
)

echo GitHub + Render deploy оғоз мешавад...
node scripts\deploy-render.mjs

echo.
echo ========================================
echo   ҚАДАМИ ОХИРИН:
echo   1. https://dashboard.render.com/select-repo?type=blueprint
echo   2. Repo: reels-miniapp
echo   3. TELEGRAM_BOT_TOKEN гузоред
echo   4. Deploy
echo   5. node setup-bot.js https://reels-miniapp.onrender.com
echo ========================================
echo.
start https://dashboard.render.com/select-repo?type=blueprint
pause
