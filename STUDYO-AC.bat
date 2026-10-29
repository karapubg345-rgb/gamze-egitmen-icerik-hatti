@echo off
chcp 65001 >nul
rem Gamze Eğitmen Stüdyo: arayüz sunucusunu başlatır ve Chrome'da açar.
cd /d "%~dp0"
set "URL=http://127.0.0.1:4747"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
start "" /b node arayuz\sunucu.mjs
timeout /t 2 >nul
if exist "%CHROME%" (start "" "%CHROME%" "%URL%") else (start "" "%URL%")
echo.
echo Stüdyo açık: %URL%
echo Bu pencere açık kaldıkça arayüz çalışır. Kapatınca durur.
pause >nul
