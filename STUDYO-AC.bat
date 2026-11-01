@echo off
chcp 65001 >nul
rem Gamze Eğitmen Stüdyo: arayüz sunucusunu (ve .env'de token varsa Telegram botunu) başlatır, Chrome'da açar.
rem Telegram'dan /guncelle gelince sunucu 75 koduyla çıkar; bu pencere onu güncel kodla yeniden açar.
cd /d "%~dp0"
set "URL=http://127.0.0.1:4747"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
rem Tarayıcı, sunucu ayağa kalktıktan sonra açılsın.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 3; if (Test-Path '%CHROME%') { Start-Process '%CHROME%' '%URL%' } else { Start-Process '%URL%' }"
echo.
echo Stüdyo açılıyor: %URL%
echo Bu pencere açık kaldıkça arayüz ve Telegram botu çalışır. Kapatınca durur.
echo.
:basla
node arayuz\sunucu.mjs
if %errorlevel%==75 (
  echo Güncellendi, yeniden başlıyor...
  goto basla
)
echo.
echo Sunucu durdu (kod %errorlevel%). Kapatmak için bir tuşa basın.
pause >nul
