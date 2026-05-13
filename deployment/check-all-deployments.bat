@echo off
REM ============================================
REM NovaMed - Check All Deployments
REM ============================================

echo.
echo ========================================
echo   NOVAMED DEPLOYMENT STATUS
echo ========================================
echo.

echo ----------------------------------------
echo   GIT STATUS
echo ----------------------------------------
git status --short
if errorlevel 1 (
    echo ERROR: Not a git repository
) else (
    echo.
    echo Last commit:
    git log -1 --oneline
    echo.
    echo Remote status:
    git fetch origin >nul 2>&1
    git status -uno
)
echo.

echo ----------------------------------------
echo   BACKEND (RENDER)
echo ----------------------------------------
echo.
echo Status: Check Render Dashboard
echo URL: https://dashboard.render.com
echo.
echo Recent commits that triggered deploys:
git log --oneline -5
echo.

echo ----------------------------------------
echo   FRONTEND (FIREBASE)
echo ----------------------------------------
echo.
echo Live URL: https://pharmaai-8bb36.web.app
echo Console: https://console.firebase.google.com/project/pharmaai-8bb36
echo.
firebase hosting:channel:list 2>nul
if errorlevel 1 (
    echo WARNING: Firebase CLI not available or not logged in
)
echo.

echo ----------------------------------------
echo   QUICK ACTIONS
echo ----------------------------------------
echo.
echo 1. Deploy everything:        deploy-all.bat
echo 2. Quick deploy:             quick-deploy-all.bat
echo 3. Frontend only:            quick-deploy.bat
echo 4. Backend only:             git push origin main
echo 5. Open live frontend:       start https://pharmaai-8bb36.web.app
echo 6. Open Render dashboard:    start https://dashboard.render.com
echo.

set /p action="Enter action number (or press Enter to exit): "

if "%action%"=="1" call deploy-all.bat
if "%action%"=="2" call quick-deploy-all.bat
if "%action%"=="3" call quick-deploy.bat
if "%action%"=="4" (
    git add .
    git commit -m "Quick update"
    git push origin main
)
if "%action%"=="5" start https://pharmaai-8bb36.web.app
if "%action%"=="6" start https://dashboard.render.com

echo.
pause
