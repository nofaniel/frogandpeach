@echo off
title Flat Hub
cd /d "%~dp0"
echo.
echo  Starting Flat Hub...
echo  Press Ctrl+C to stop.
echo.
node server.js
pause
