@echo off
setlocal

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8000"

cd /d "%~dp0"
echo Starting local server at http://localhost:%PORT%

where py >nul 2>&1
if %errorlevel%==0 (
	py -3 -m http.server %PORT%
	exit /b %errorlevel%
)

where python >nul 2>&1
if %errorlevel%==0 (
	python -m http.server %PORT%
	exit /b %errorlevel%
)

echo Python is not installed or not available on PATH.
exit /b 1

endlocal
