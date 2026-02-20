@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

title ZaloRemote Dev Server
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       ZaloRemote Development Server      ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── Check Node.js ──
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js not found! Please install from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  [INFO] Node.js %NODE_VER% detected

:: ── Change to script directory ──
cd /d "%~dp0"
echo  [INFO] Working directory: %cd%

:: ── Install dependencies if needed ──
if not exist "node_modules" (
    echo.
    echo  [SETUP] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo  [ERROR] npm install failed!
        pause
        exit /b 1
    )
    echo  [SETUP] Dependencies installed successfully.
) else (
    echo  [INFO] node_modules found, skipping install.
)

echo.
echo  ══════════════════════════════════════════
echo   Vite dev server with auto-restart
echo   - HMR: source code changes auto-reload
echo   - Config changes: auto-restart server
echo   - Press Ctrl+C to stop
echo  ══════════════════════════════════════════
echo.

:: ── Hash config files for change detection ──
set "CONFIG_FILES=package.json vite.config.ts tsconfig.json tsconfig.node.json"

:start_server
:: Save config hashes
for %%f in (%CONFIG_FILES%) do (
    if exist "%%f" (
        for /f "tokens=*" %%h in ('certutil -hashfile "%%f" MD5 2^>nul ^| findstr /v "hash certutil"') do (
            set "HASH_%%~nf=%%h"
        )
    )
)

echo  [%time:~0,8%] Starting Vite dev server...
echo.

:: Start Vite in foreground, capture exit code
call npx vite --host

set EXIT_CODE=%errorlevel%
echo.

:: If Ctrl+C was pressed (exit code > 1 or specific codes), exit gracefully
if %EXIT_CODE% equ 0 (
    echo  [INFO] Server stopped normally.
    goto end
)

:: Check if config files changed
set "CONFIG_CHANGED=0"
for %%f in (%CONFIG_FILES%) do (
    if exist "%%f" (
        for /f "tokens=*" %%h in ('certutil -hashfile "%%f" MD5 2^>nul ^| findstr /v "hash certutil"') do (
            set "NEW_HASH=%%h"
            if not "!NEW_HASH!"=="!HASH_%%~nf!" (
                set "CONFIG_CHANGED=1"
                echo  [CHANGE] Config file changed: %%f
            )
        )
    )
)

if %CONFIG_CHANGED% equ 1 (
    echo.
    echo  [RESTART] Config changed, reinstalling deps...
    call npm install >nul 2>&1
    echo  [RESTART] Restarting server in 2 seconds...
    timeout /t 2 /nobreak >nul
    goto start_server
)

:: Server crashed or was killed - auto restart
echo  [RESTART] Server exited (code: %EXIT_CODE%). Restarting in 3 seconds...
echo  [RESTART] Press Ctrl+C again to stop.
timeout /t 3 /nobreak >nul
goto start_server

:end
echo.
echo  [INFO] ZaloRemote dev server stopped.
echo.
pause
