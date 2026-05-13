@echo off
REM ============================================
REM NovaMed - Pre-Deployment Checklist
REM ============================================
REM Run this before deploying to catch issues early

echo.
echo ========================================
echo   NOVAMED PRE-DEPLOYMENT CHECK
echo ========================================
echo.

set ERROR_COUNT=0

REM Check 1: Node.js
echo [1/8] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] Node.js not found
    set /a ERROR_COUNT+=1
) else (
    node --version
    echo   [PASS] Node.js installed
)
echo.

REM Check 2: Firebase CLI
echo [2/8] Checking Firebase CLI...
firebase --version >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] Firebase CLI not found
    echo   Install with: npm install -g firebase-tools
    set /a ERROR_COUNT+=1
) else (
    firebase --version
    echo   [PASS] Firebase CLI installed
)
echo.

REM Check 3: Frontend directory
echo [3/8] Checking frontend directory...
if exist "frontend" (
    echo   [PASS] Frontend directory exists
) else (
    echo   [FAIL] Frontend directory not found
    set /a ERROR_COUNT+=1
)
echo.

REM Check 4: Firebase config
echo [4/8] Checking Firebase configuration...
if exist "firebase.json" (
    echo   [PASS] firebase.json exists
) else (
    echo   [FAIL] firebase.json not found
    set /a ERROR_COUNT+=1
)
if exist ".firebaserc" (
    echo   [PASS] .firebaserc exists
) else (
    echo   [FAIL] .firebaserc not found
    set /a ERROR_COUNT+=1
)
echo.

REM Check 5: Frontend dependencies
echo [5/8] Checking frontend dependencies...
if exist "frontend\node_modules" (
    echo   [PASS] Dependencies installed
) else (
    echo   [WARN] Dependencies not installed
    echo   Run: cd frontend ^&^& npm install
)
echo.

REM Check 6: Environment file
echo [6/8] Checking environment configuration...
if exist "frontend\.env" (
    echo   [PASS] .env file exists
) else (
    echo   [WARN] .env file not found
    echo   Copy from .env.example if needed
)
echo.

REM Check 7: TypeScript check
echo [7/8] Running TypeScript check...
cd frontend
call npx tsc --noEmit >nul 2>&1
if errorlevel 1 (
    echo   [WARN] TypeScript errors found
    echo   Run: npm run build:check for details
) else (
    echo   [PASS] No TypeScript errors
)
cd ..
echo.

REM Check 8: Firebase project
echo [8/8] Checking Firebase project...
firebase projects:list >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] Not logged in to Firebase
    echo   Run: firebase login
    set /a ERROR_COUNT+=1
) else (
    echo   [PASS] Firebase authenticated
)
echo.

REM Summary
echo ========================================
echo   CHECK SUMMARY
echo ========================================
if %ERROR_COUNT% EQU 0 (
    echo   Status: READY TO DEPLOY
    echo   All critical checks passed!
    echo.
    echo   Run deploy.bat to deploy now
) else (
    echo   Status: NOT READY
    echo   Found %ERROR_COUNT% critical error(s)
    echo.
    echo   Please fix the errors above before deploying
)
echo ========================================
echo.
pause
