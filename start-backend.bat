@echo off
echo 啟動海戰棋後端伺服器 (port 3001)...
cd /d "%~dp0backend"
node server.js
pause
