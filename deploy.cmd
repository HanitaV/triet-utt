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
set "TEMP_WORKTREE=.deploy-gh-pages"
set "WORKTREE_CREATED=0"
set "EXIT_CODE=0"

echo [*] Starting deployment...

:: 1. Ensure no unrelated local changes before pulling
set HAS_BLOCKING_CHANGES=
for /f "tokens=1,*" %%i in ('"%GIT_PATH%" status --porcelain') do (
    if /i not "%%j"=="version.json" set HAS_BLOCKING_CHANGES=1
)
if defined HAS_BLOCKING_CHANGES (
    echo [!] Working tree has uncommitted changes. Please commit or stash them first.
    exit /b 1
)

:: 2. Pull latest changes to avoid conflicts
echo [*] Pulling from main...
"%GIT_PATH%" pull origin main
if %errorlevel% neq 0 (
    echo [!] Error pulling from main. Please resolve conflicts first.
    exit /b %errorlevel%
)

:: 3. Auto-update version info after pull to avoid local merge conflicts
echo [*] Updating version info...
call node update_version.js
if %errorlevel% neq 0 (
    echo [!] Error updating version info.
    exit /b %errorlevel%
)

:: 4. Check if there are changes to commit (now including version.json)
set HAS_CHANGES=
"%GIT_PATH%" status -s > nul 2>&1
for /f %%i in ('"%GIT_PATH%" status -s') do set HAS_CHANGES=1

if defined HAS_CHANGES (
    echo [*] Committing changes...
    "%GIT_PATH%" add -A
    "%GIT_PATH%" commit -m "%COMMIT_MSG%"
) else (
    echo [*] No changes to commit
)

:: Push to main first
echo [*] Pushing to main...
"%GIT_PATH%" push origin main
if %errorlevel% neq 0 (
    echo [!] Error pushing to main.
    exit /b %errorlevel%
)

:: Create a temporary worktree for gh-pages so the main tree stays on main
echo [*] Preparing gh-pages worktree...
if exist "%TEMP_WORKTREE%" rmdir /s /q "%TEMP_WORKTREE%"
"%GIT_PATH%" worktree add -B gh-pages "%TEMP_WORKTREE%" origin/gh-pages
if %errorlevel% neq 0 (
    echo [!] Error creating gh-pages worktree.
    set "EXIT_CODE=%errorlevel%"
    goto cleanup
)
set "WORKTREE_CREATED=1"

pushd "%TEMP_WORKTREE%"

echo [*] Merging main into gh-pages...
"%GIT_PATH%" merge main
if %errorlevel% neq 0 (
    echo [!] Merge conflicts detected. Resolving in favor of main...
    for /f "delims=" %%F in ('"%GIT_PATH%" diff --name-only --diff-filter=U') do (
        "%GIT_PATH%" checkout --theirs -- "%%F"
        "%GIT_PATH%" add -- "%%F"
    )
    "%GIT_PATH%" commit --no-edit
    if %errorlevel% neq 0 (
        set "EXIT_CODE=%errorlevel%"
        popd
        echo [!] Error finalizing resolved merge in gh-pages.
        goto cleanup
    )

echo [*] Pushing to gh-pages...
"%GIT_PATH%" push origin gh-pages
if %errorlevel% neq 0 (
    set "EXIT_CODE=%errorlevel%"
    popd
    echo [!] Error pushing gh-pages.
    goto cleanup
)

popd

goto cleanup

:cleanup
echo [*] Cleaning up gh-pages worktree...
if "%WORKTREE_CREATED%"=="1" (
    "%GIT_PATH%" worktree remove "%TEMP_WORKTREE%" --force
    if %errorlevel% neq 0 (
        echo [!] Warning: failed to remove temporary gh-pages worktree.
    )
)

if not "%EXIT_CODE%"=="0" exit /b %EXIT_CODE%

echo [+] Deployment complete!
echo [+] Site will be live at: https://hanitav.github.io/triet-utt/

exit /b 0

endlocal
