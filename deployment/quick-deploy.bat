@echo off
REM ============================================
REM NovaMed - Quick Deploy (Skip Dependencies)
REM ============================================
REM Use this when dependencies are already installed

echo.
echo ========================================
echo   NOVAMED QUICK DEPLOY
echo ========================================
echo.

echo [1/2] Building frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo Build: OK
echo.

echo [2/2] Deploying to Firebase...
firebase deploy --only hosting
if errorlevel 1 (
    echo ERROR: Deployment failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOYMENT SUCCESSFUL!
echo ========================================
echo.
echo Live at: https://pharmaai-8bb36.web.app
echo.
pause
