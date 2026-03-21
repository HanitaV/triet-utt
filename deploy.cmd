@echo off
setlocal enabledelayedexpansion

set "GIT_PATH=C:\Program Files\Git\cmd\git.exe"
set "NODE_PATH=C:\Program Files\nodejs\node.exe"

set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Update site"

echo Updating version...
call "%NODE_PATH%" update_version.js

echo Adding changes...
call "%GIT_PATH%" add -A

echo Committing: %COMMIT_MSG%
call "%GIT_PATH%" commit -m "%COMMIT_MSG%"

echo Pushing to main...
call "%GIT_PATH%" push origin main

echo Switching to gh-pages...
call "%GIT_PATH%" checkout gh-pages

echo Merging from main...
call "%GIT_PATH%" merge main -m "Merge main into gh-pages"

echo Pushing gh-pages...
call "%GIT_PATH%" push origin gh-pages

echo Switching back to main...
call "%GIT_PATH%" checkout main

echo Deployment completed!

endlocal
