@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   GoldenERP V1.0 - Start Script
echo ========================================
echo.

:: Step 1: Start MySQL
echo [1/3] Starting MySQL Server...
start "GoldenERP-MySQL" /MIN "C:\Program Files\MySQL\MySQL Server 26.7\bin\mysqld.exe" --datadir="f:/goldenerp/mysql_data" --port=3306 --console
timeout /t 5 /nobreak > nul

:: Test MySQL
"C:\Program Files\MySQL\MySQL Server 26.7\bin\mysql.exe" -u root -e "SELECT 1;" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] MySQL did not start! Waiting more...
    timeout /t 5 /nobreak > nul
    "C:\Program Files\MySQL\MySQL Server 26.7\bin\mysql.exe" -u root -e "SELECT 1;" 2>nul
    if %errorlevel% neq 0 (
        echo [FATAL] MySQL failed! Check the MySQL terminal window.
        pause
        exit /b 1
    )
)
echo [1/3] MySQL is running on port 3306
echo.

:: Step 2: Start Backend
echo [2/3] Starting Backend...
cd /d f:\goldenerp\backend
start "GoldenERP-Backend" /MIN cmd /c "npm run start:dev"
echo [2/3] Backend starting on http://localhost:4000
echo.

:: Step 3: Start Frontend
echo [3/3] Starting Frontend...
cd /d f:\goldenerp\frontend
start "GoldenERP-Frontend" /MIN cmd /c "npm run dev"
echo [3/3] Frontend starting on http://localhost:3000
echo.

echo ========================================
echo   All services started!
echo.
echo   Frontend: http://localhost:3000/login
echo   Backend:  http://localhost:4000/api
echo   Login:    admin / admin123
echo ========================================
echo.
echo Press any key to STOP all services...
pause > nul

:: Cleanup
echo Stopping services...
taskkill /FI "WINDOWTITLE eq GoldenERP-Backend*" /F 2>nul
taskkill /FI "WINDOWTITLE eq GoldenERP-Frontend*" /F 2>nul
taskkill /IM mysqld.exe /F 2>nul
echo All services stopped.
pause
