@echo off
chcp 65001 >nul
title Насби ngrok (устувор tunnel)
echo ========================================
echo   Насби ngrok барои Telegram Mini App
echo ========================================
echo.
echo 1. Ба сайт равед: https://dashboard.ngrok.com/signup
echo 2. Баъд: https://dashboard.ngrok.com/get-started/your-authtoken
echo 3. Token-ро нусха баред
echo.
set /p TOKEN="Token-ро инҷо гузоред: "
if "%TOKEN%"=="" (echo Хато: token холӣ аст & pause & exit /b 1)
powershell -Command "(Get-Content .env) -replace '^NGROK_AUTHTOKEN=.*', 'NGROK_AUTHTOKEN=%TOKEN%' | Set-Content .env"
echo.
echo Тайёр! Ҳоло start.bat-ро иҷро кунед.
pause
