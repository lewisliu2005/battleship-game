@echo off
echo 啟動海戰棋前端 (port 5173)...
cd /d "%~dp0frontend"
cmd /c "npm run dev"
pause
