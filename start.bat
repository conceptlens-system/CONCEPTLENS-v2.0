@echo off
echo ==========================================
echo       Starting CONCEPTLENS Platform
echo ==========================================

echo [1/4] Checking Backend Environment...
if not exist "backend\venv\Scripts\python.exe" (
    echo Virtual environment not found. Creating...
    cd backend
    python -m venv venv
    venv\Scripts\pip install -r requirements.txt
    cd ..
) else (
    echo Backend venv found.
)

echo [2/4] Checking Frontend Environment...
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
) else (
    echo Frontend dependencies found.
)

echo [3/4] Checking Root Environment...
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
) else (
    echo Root dependencies found.
)

echo [4/4] Starting Server...
echo The website will open at: http://localhost:3000
echo Use Ctrl+C to stop.
echo.
call npm run dev
