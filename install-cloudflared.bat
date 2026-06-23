@echo off
chcp 65001 >nul
title Насби cloudflared
echo ========================================
echo   Насби cloudflared (устувор tunnel)
echo ========================================
echo.
winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements
echo.
echo Тайёр! Ҳоло start.bat-ро аз нав иҷро кунед.
pause
