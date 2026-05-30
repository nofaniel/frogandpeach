@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\" (
  echo Installing npm dependencies...
  call npm install || goto :fail
)

echo Building Frog ^& Peach...
call npm run build || goto :fail

echo.
echo Build complete.
pause
exit /b 0

:fail
echo.
echo Build failed.
pause
exit /b 1
