@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\" (
  echo Installing npm dependencies...
  call npm install || goto :fail
)

echo Building Frog ^& Peach before starting the full app/API...
call npm run build || goto :fail

echo.
echo Starting full local app/API on:
echo   http://localhost:8788
echo.
echo LAN URLs to try from a phone on the same Wi-Fi:
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254*' } | ForEach-Object { '  http://' + $_.IPAddress + ':8788' }"
echo.
echo If mobile still cannot connect, allow Node.js/Wrangler through Windows Firewall for private networks.
echo Admin is the root page after login: http://localhost:8788/
echo.

call npm run dev:worker || goto :fail
exit /b 0

:fail
echo.
echo App server failed to start.
pause
exit /b 1
