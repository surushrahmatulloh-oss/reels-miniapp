@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Deploy ба Render.com
echo ========================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo Git насб нест. Аз https://git-scm.com/download/win насб кунед.
  pause
  exit /b 1
)

if not exist .git (
  echo Git repo эҷод мешавад...
  git init
  git branch -M main
)

git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Deploy: Reels Mini App for Render"
  echo Commit сохта шуд.
) else (
  echo Commit нест ё аллакай commit шудааст.
)

echo.
echo ========================================
echo   ҚАДАМХОИ БОҚИМАНДА (1 маротиба):
echo ========================================
echo.
echo 1. Лоиҳаро ба GitHub suborед:
echo    - https://github.com/new
echo    - Ном: reels-miniapp
echo    - Public
echo.
echo 2. Дар терминал (token-и GitHub лозим):
echo    git remote add origin https://github.com/YOUR_USER/reels-miniapp.git
echo    git push -u origin main
echo.
echo 3. Render.com:
echo    - https://dashboard.render.com/select-repo?type=blueprint
echo    - Repo-ро интихоб кунед
echo    - TELEGRAM_BOT_TOKEN-ро гузоред
echo    - Deploy
echo.
echo 4. Пас аз deploy (URL-ро иваз кунед):
echo    node setup-bot.js https://reels-miniapp.onrender.com
echo.
echo ========================================

where gh >nul 2>&1
if not errorlevel 1 (
  echo GitHub CLI ёфт шуд. Мехоҳед repo эҷод кунед? (Y/N)
  set /p CREATE_GH=
  if /i "%CREATE_GH%"=="Y" (
    gh repo create reels-miniapp --public --source=. --remote=origin --push
    echo.
    echo Ҳоло Render: https://dashboard.render.com/select-repo?type=blueprint
    start https://dashboard.render.com/select-repo?type=blueprint
  )
) else (
  echo GitHub CLI нест. Қадамҳои болоро дастӣ иҷро кунед.
  start https://github.com/new
)

pause
