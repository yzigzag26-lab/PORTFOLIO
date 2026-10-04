@echo off
REM Builds the public\ folder for `wasmer deploy` (Windows).
REM Run this from the LINUXBOSS folder whenever you change the site,
REM then run `wasmer deploy` to publish the update.
cd /d "%~dp0"
rmdir /s /q public 2>nul
mkdir public
copy /Y index.html public\index.html >nul
copy /Y admin.html public\admin.html >nul
copy /Y 404.html public\404.html >nul
copy /Y 50x.html public\50x.html >nul
xcopy css public\css\ /E /I /Q >nul
xcopy js public\js\ /E /I /Q >nul
xcopy data public\data\ /E /I /Q >nul
xcopy assets public\assets\ /E /I /Q >nul
del /s /q public\.gitkeep >nul 2>&1
echo public\ is ready. Now run:  wasmer deploy
