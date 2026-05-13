@echo off
setlocal enabledelayedexpansion
REM ============================================
REM NovaMed - Full Stack Deployment
REM ============================================
REM Deploys both backend (Render) and frontend (Firebase)

REM Always run from project root (parent of the deployment/ folder)
cd /d "%~dp0.."

echo.
echo ========================================
echo   NOVAMED FULL STACK DEPLOYMENT
echo ========================================
echo Working directory: %CD%
echo.

REM Get commit message (do NOT wrap in quotes when typing)
set "commit_msg=Deploy: latest changes"
set /p commit_msg="Enter commit message (no quotes, press Enter for default): "


echo.
echo ========================================
echo   STEP 1: BACKEND DEPLOYMENT (RENDER)
echo ========================================
echo.

echo [1/3] Checking for changes...
git status --short
echo.

echo [2/3] Staging all changes...
git add .
if errorlevel 1 (
    echo ERROR: Failed to stage changes
    pause
    exit /b 1
)
echo Staged: OK
echo.

echo [3/3] Committing and pushing to GitHub...
git commit -m "%commit_msg%"
if errorlevel 1 (
    echo WARNING: No changes to commit - pushing existing HEAD anyway...
)
echo.

echo Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo ERROR: Failed to push to GitHub
    echo Please check your git configuration and try again
    pause
    exit /b 1
)
echo Push: OK
echo.

echo Backend deployment initiated!
echo Render will automatically detect the push and redeploy.
echo This takes about 2-5 minutes.
echo.
echo Check status at: https://dashboard.render.com
echo.

timeout /t 3 /nobreak > nul

echo ========================================
echo   STEP 2: FRONTEND DEPLOYMENT (FIREBASE)
echo ========================================
echo.

echo [1/2] Building frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed
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
    echo ERROR: Firebase deployment failed
    pause
    exit /b 1
)
echo.

echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Backend: Deploying on Render (2-5 min)
echo    Check: https://dashboard.render.com
echo.
echo Frontend: Live on Firebase
echo    URL: https://pharmaai-8bb36.web.app
echo.
echo Commit: "%commit_msg%"
echo.
echo ========================================
echo.

set /p open_sites="Open deployment sites? (y/n): "
if /i "%open_sites%"=="y" (
    start https://pharmaai-8bb36.web.app
    start https://dashboard.render.com
)

echo.
pause

