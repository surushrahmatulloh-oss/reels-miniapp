@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Render — MongoDB Atlas setup

echo ========================================
echo   Render Environment Variables
echo ========================================
echo.
echo Дар Render Dashboard ^> reels-miniapp ^> Environment:
echo.
echo 1. MONGODB_URI
echo    mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/reels
echo.
echo 2. USE_MEMORY_DB = false  ^(render.yaml аллакай false^)
echo.
echo 3. YOUTUBE_API_KEY = ^(Google Cloud^)
echo.
echo 4. ADMIN_API_KEY = ^(secret key for admin API^)
echo.
echo 5. Save Changes ^> Manual Deploy
echo.
echo Ё автоматӣ (агар RENDER_API_KEY дар .env.deploy бошад):
echo   node scripts\setup-render-atlas.mjs
echo.
echo ========================================
start https://dashboard.render.com/
echo.
echo Пас аз deploy:
echo   node scripts\trigger-fetch-videos.mjs
pause
