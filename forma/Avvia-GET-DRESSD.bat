@echo off
cd /d "%~dp0"
node serve.mjs
if errorlevel 1 pause
