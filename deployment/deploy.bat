@echo off
REM ============================================
REM NovaMed - Firebase Deployment Script
REM ============================================
REM This script builds and deploys the frontend to Firebase Hosting

echo.
echo ========================================
echo   NOVAMED DEPLOYMENT
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "frontend" (
    echo ERROR: frontend directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

if not exist "firebase.json" (
    echo ERROR: firebase.json not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js: OK
echo.

echo [2/4] Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    cd ..
    pause
    exit /b 1
)
echo Dependencies: OK
echo.

echo [3/4] Building frontend for production...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    cd ..
    pause
    exit /b 1
)
echo Build: OK
cd ..
echo.

echo [4/4] Deploying to Firebase...
firebase deploy --only hosting
if errorlevel 1 (
    echo ERROR: Deployment failed
    echo.
    echo Make sure you have:
    echo 1. Firebase CLI installed: npm install -g firebase-tools
    echo 2. Logged in to Firebase: firebase login
    echo 3. Correct project selected: firebase use pharmaai-8bb36
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOYMENT SUCCESSFUL!
echo ========================================
echo.
echo Your app is now live at:
echo https://pharmaai-8bb36.web.app
echo.
echo To view deployment details:
echo firebase hosting:channel:list
echo.
pause
