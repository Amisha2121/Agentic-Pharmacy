@echo off
REM ============================================
REM NovaMed - Check Deployment Status
REM ============================================
REM View current deployment information

echo.
echo ========================================
echo   NOVAMED DEPLOYMENT STATUS
echo ========================================
echo.

echo Checking Firebase project...
firebase projects:list 2>nul
if errorlevel 1 (
    echo ERROR: Not logged in to Firebase
    echo Run: firebase login
    pause
    exit /b 1
)
echo.

echo Current project:
firebase use
echo.

echo ----------------------------------------
echo   HOSTING INFORMATION
echo ----------------------------------------
echo.

echo Live URL:
echo https://pharmaai-8bb36.web.app
echo.

echo Recent deployments:
firebase hosting:channel:list
echo.

echo ----------------------------------------
echo   QUICK ACTIONS
echo ----------------------------------------
echo.
echo 1. View in browser:    start https://pharmaai-8bb36.web.app
echo 2. Firebase Console:   start https://console.firebase.google.com/project/pharmaai-8bb36
echo 3. Deploy now:         deploy.bat
echo 4. Quick deploy:       quick-deploy.bat
echo.

set /p action="Enter action number (or press Enter to exit): "

if "%action%"=="1" start https://pharmaai-8bb36.web.app
if "%action%"=="2" start https://console.firebase.google.com/project/pharmaai-8bb36
if "%action%"=="3" call deploy.bat
if "%action%"=="4" call quick-deploy.bat

echo.
pause
