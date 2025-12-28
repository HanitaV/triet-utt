@echo off
setlocal enabledelayedexpansion

:: Deploy script for GitHub Pages
:: Usage: deploy.cmd [commit message]

:: Default commit message
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Update site"

echo 🚀 Starting deployment...

:: 1. Auto-update version info
echo 🔄 Updating version info...
call node update_version.js

:: 2. Pull latest changes to avoid conflicts
echo 📥 Pulling from main...
git pull origin main
if %errorlevel% neq 0 (
    echo ❌ Error pulling from main. Please resolve conflicts first.
    exit /b %errorlevel%
)

:: 3. Check if there are changes to commit (now including version.json)
git status -s > nul 2>&1
for /f %%i in ('git status -s') do set HAS_CHANGES=1

if defined HAS_CHANGES (
    echo 📝 Committing changes...
    git add -A
    git commit -m "%COMMIT_MSG%"
) else (
    echo No changes to commit
)

:: Get current branch
for /f "tokens=*" %%b in ('git branch --show-current') do set "CURRENT_BRANCH=%%b"

:: Push to main first
echo 📤 Pushing to main...
git push origin main

:: Switch to gh-pages and merge
echo 🔀 Switching to gh-pages...
git checkout gh-pages

echo 🔗 Merging main into gh-pages...
git merge main

echo 📤 Pushing to gh-pages...
git push origin gh-pages

:: Switch back to original branch
echo ↩️ Switching back to %CURRENT_BRANCH%...
git checkout "%CURRENT_BRANCH%"

echo ✅ Deployment complete!
echo 🌐 Site will be live at: https://hanitav.github.io/triet-utt/

endlocal
