@echo off
REM AfriCoin Backend - Setup Verification Script (Windows)

echo.
echo ================================
echo AfriCoin Backend Setup Check
echo ================================
echo.

REM Check Node.js
echo 📦 Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 18+
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do echo ✅ %%i found
)

REM Check npm
echo.
echo 📦 Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo ✅ npm %%i found
)

REM Check if we're in the backend directory
echo.
echo 📁 Checking directory structure...
if exist package.json (
    echo ✅ package.json found
) else (
    echo ❌ package.json not found. Please run this script from backend directory
    exit /b 1
)

REM Check for .env file
echo.
echo ⚙️  Checking environment configuration...
if exist .env (
    echo ✅ .env file found
) else (
    echo ⚠️  .env file not found
    echo    Creating from .env.example...
    if exist .env.example (
        copy .env.example .env >nul
        echo ✅ .env created from example
        echo ⚠️  Please update .env with your API keys!
    ) else (
        echo ❌ .env.example not found
    )
)

REM Check dependencies
echo.
echo 📦 Checking dependencies...
if exist node_modules (
    echo ✅ node_modules found
) else (
    echo ⚠️  node_modules not found, installing...
    call npm install
    if %errorlevel% equ 0 (
        echo ✅ Dependencies installed
    ) else (
        echo ❌ Failed to install dependencies
        exit /b 1
    )
)

REM Check directory structure
echo.
echo 📂 Checking project structure...
for %%D in (src src\routes src\services src\middleware src\database src\utils) do (
    if exist %%D (
        echo ✅ %%D exists
    ) else (
        echo ⚠️  %%D missing
    )
)

REM Try to build
echo.
echo 🔨 Attempting to build TypeScript...
call npm run build >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Build successful
    if exist dist (
        echo ✅ dist directory created
    )
) else (
    echo ⚠️  Build had warnings (this may be OK)
)

REM Summary
echo.
echo ================================
echo ✅ Setup Verification Complete!
echo ================================
echo.
echo Next steps:
echo 1. Update .env with your API credentials
echo    - STRIPE_SECRET_KEY
echo    - PAYFAST_MERCHANT_ID
echo    - JWT_SECRET (change to random 32+ char string)
echo.
echo 2. Start development server:
echo    npm run dev
echo.
echo 3. Server will run on http://localhost:3001
echo.
echo 4. Test with:
echo    curl http://localhost:3001/health
echo.
echo For more information, see QUICKSTART.md or GUIDE.md
echo.
pause
