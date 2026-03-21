@echo off
setlocal enabledelayedexpansion

REM Add git, node, npm to PATH
set "PATH=C:\Program Files\Git\cmd;C:\Program Files\nodejs;%PATH%"

set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Update site"

echo.
echo ======================================
echo DEPLOY TO GITHUB PAGES
echo ======================================
echo.

echo [1] Update version...
call node update_version.js

echo [2] Git add all...
call git add -A

echo [3] Git commit...
call git commit -m "%COMMIT_MSG%"

echo [4] Git push main...
call git push origin main

echo [5] Checkout gh-pages...
call git checkout gh-pages

echo [6] Merge from main...
call git merge main -m "Merge main into gh-pages"

echo [7] Push gh-pages...
call git push origin gh-pages

echo [8] Back to main...
call git checkout main

echo.
echo ======================================
echo.  DONE! Site: https://hanitav.github.io/triet-utt/
echo ======================================
echo.

endlocal
