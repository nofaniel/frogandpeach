@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\" (
  echo Installing npm dependencies...
  call npm install || goto :fail
)

echo Starting quick frontend-only test site on:
echo   http://localhost:5173
echo.
echo LAN URLs to try from a phone on the same Wi-Fi:
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254*' } | ForEach-Object { '  http://' + $_.IPAddress + ':5173' }"
echo.
echo This Vite server is only for frontend testing; login/API features need run.bat.
echo.

call npm run dev || goto :fail
exit /b 0

:fail
echo.
echo Test site failed to start.
pause
exit /b 1
