@echo off
setlocal enabledelayedexpansion

:: Deploy script for GitHub Pages
:: Usage: deploy.cmd [commit message]

:: Set Git and Node paths
set "GIT_PATH=C:\Program Files\Git\cmd\git.exe"
set "NODE_PATH=C:\Program Files\nodejs"
set "PATH=%NODE_PATH%;%PATH%"

:: Default commit message
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Update site"

echo [*] Starting deployment...

:: 1. Auto-update version info
echo [*] Updating version info...
call node update_version.js

:: 2. Pull latest changes to avoid conflicts
echo [*] Pulling from main...
"%GIT_PATH%" pull origin main
if %errorlevel% neq 0 (
    echo [!] Error pulling from main. Please resolve conflicts first.
    exit /b %errorlevel%
)

:: 3. Check if there are changes to commit (now including version.json)
"%GIT_PATH%" status -s > nul 2>&1
for /f %%i in ('"C:\Program Files\Git\cmd\git.exe" status -s') do set HAS_CHANGES=1

if defined HAS_CHANGES (
    echo [*] Committing changes...
    "%GIT_PATH%" add -A
    "%GIT_PATH%" commit -m "%COMMIT_MSG%"
) else (
    echo [*] No changes to commit
)

:: Get current branch
for /f "tokens=*" %%b in ('"C:\Program Files\Git\cmd\git.exe" branch --show-current') do set "CURRENT_BRANCH=%%b"

:: Push to main first
echo [*] Pushing to main...
"%GIT_PATH%" push origin main

:: Switch to gh-pages and merge
echo [*] Switching to gh-pages...
"%GIT_PATH%" checkout gh-pages

echo [*] Merging main into gh-pages...
"%GIT_PATH%" merge main

echo [*] Pushing to gh-pages...
"%GIT_PATH%" push origin gh-pages

:: Switch back to original branch
echo [*] Switching back to %CURRENT_BRANCH%...
"%GIT_PATH%" checkout "%CURRENT_BRANCH%"

echo [+] Deployment complete!
echo [+] Site will be live at: https://hanitav.github.io/triet-utt/

endlocal
