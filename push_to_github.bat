@echo off
if not exist ".git" (
    echo Initializing git repository...
    git init
)

echo Setting remote URL to https://github.com/Amisha2121/Agentic-Pharmacy.git...
git remote add origin https://github.com/Amisha2121/Agentic-Pharmacy.git 2>nul
git remote set-url origin https://github.com/Amisha2121/Agentic-Pharmacy.git

echo Configuring Git Identity...
git config user.name "Amisha"
git config user.email "amisha2121@users.noreply.github.com"

echo Staging all files...
git add .

echo Committing changes...
git commit -m "feat: Fix new user inventory state, update onboarding, and add legacy migration UI"

echo Pushing to GitHub...
git push -u origin main || git push -u origin master

echo Done!
pause
