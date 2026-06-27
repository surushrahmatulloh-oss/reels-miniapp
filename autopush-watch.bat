@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Auto-push watcher
echo Watching files — auto push on save (Ctrl+C to stop)
node scripts\watch-and-push.mjs
