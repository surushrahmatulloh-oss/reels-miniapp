@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Render — Manual Deploy

echo ========================================
echo   Render — Deploy дастӣ (муҳим!)
echo ========================================
echo.
echo GitHub push муваффақ шуд, аммо Render
echo версияи КӮHнаро иҷро мекунад (2.2.0 / 12 видё).
echo.
echo ИН КАДАМҲОРО КУНЕД:
echo.
echo 1. Дар браузер кушоед: dashboard.render.com
echo 2. Сервис: reels-miniapp
echo 3. Тугма: Manual Deploy
echo 4. Интихоб: Clear build cache ^& deploy
echo 5. 5-7 дақиқа интизор шавед
echo.
echo Санҷиш: https://reels-miniapp.onrender.com/health
echo   Бояд: version 2.3.1, videos 27
echo.
echo Deploy Hook (барои оянда):
echo   Settings - Deploy Hook - URL дар .env.deploy
echo   RENDER_DEPLOY_HOOK=...
echo.
start https://dashboard.render.com/
pause
