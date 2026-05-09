@echo off
echo Removing unwanted markdown files...
del /Q DEPLOYMENT_CHECKLIST.md 2>nul
del /Q DEVELOPER_GUIDE.md 2>nul
del /Q IMPLEMENTATION_SUMMARY.md 2>nul
del /Q QUICK_START.md 2>nul
del /Q TROUBLESHOOTING.md 2>nul
del /Q UI_UPGRADE_SUMMARY.md 2>nul
del /Q USER_SCOPED_DATA_IMPLEMENTATION.md 2>nul
del /Q USER_SCOPED_IMPLEMENTATION_COMPLETE.md 2>nul
echo Unwanted markdown files removed.

echo.
echo Organizing backend scripts...
if exist move_scripts.bat (
    call move_scripts.bat
) else (
    echo move_scripts.bat not found!
)

echo.
echo Cleanup complete! You can now safely delete cleanup.bat if you wish.
