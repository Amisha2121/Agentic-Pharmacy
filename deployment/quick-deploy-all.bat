@echo off
REM ============================================
REM NovaMed - Quick Full Stack Deployment
REM ============================================
REM Fast deployment with auto-generated commit message

echo.
echo ========================================
echo   NOVAMED QUICK DEPLOY (FULL STACK)
echo ========================================
echo.

REM Auto-generate commit message with timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a:%%b)
set commit_msg=Deploy: %mydate% %mytime%

echo Commit message: %commit_msg%
echo.

echo [BACKEND] Pushing to GitHub...
git add .
git commit -m "%commit_msg%"
git push origin main
if errorlevel 1 (
    echo WARNING: Git push failed or no changes
)
echo Backend: Deploying on Render...
echo.

echo [FRONTEND] Building and deploying...
cd frontend
call npm run build >nul 2>&1
cd ..
firebase deploy --only hosting --non-interactive
echo.

echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Backend: https://dashboard.render.com
echo Frontend: https://pharmaai-8bb36.web.app
echo.
pause
