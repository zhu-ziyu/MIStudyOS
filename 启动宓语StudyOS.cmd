@echo off
cd /d "%~dp0"
if exist "dist\MiStudyOS\MiStudyOS.exe" (
  start "" "dist\MiStudyOS\MiStudyOS.exe"
  exit /b
)
if exist ".desktop-env\Scripts\pythonw.exe" (
  start "" ".desktop-env\Scripts\pythonw.exe" "app.py"
  exit /b
)
echo Please run setup-desktop.ps1 first.
pause
