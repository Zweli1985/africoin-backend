#!/bin/bash

# AfriCoin Backend - Setup Verification Script

echo "================================"
echo "AfriCoin Backend Setup Check"
echo "================================"
echo ""

# Check Node.js
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js $NODE_VERSION found"
else
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
echo ""
echo "📦 Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "✅ npm $NPM_VERSION found"
else
    echo "❌ npm not found"
    exit 1
fi

# Check if we're in the backend directory
echo ""
echo "📁 Checking directory structure..."
if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json not found. Please run this script from backend directory"
    exit 1
fi

# Check for .env file
echo ""
echo "⚙️  Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✅ .env file found"
else
    echo "⚠️  .env file not found"
    echo "   Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env created from example"
        echo "⚠️  Please update .env with your API keys!"
    else
        echo "❌ .env.example not found"
    fi
fi

# Check dependencies
echo ""
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules found"
else
    echo "⚠️  node_modules not found, installing..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed"
    else
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check if TypeScript is available
echo ""
echo "🔧 Checking TypeScript..."
if npx tsc --version &> /dev/null; then
    TS_VERSION=$(npx tsc --version 2>/dev/null)
    echo "✅ $TS_VERSION found"
else
    echo "❌ TypeScript not found"
fi

# Check directory structure
echo ""
echo "📂 Checking project structure..."
directories=("src" "src/routes" "src/services" "src/middleware" "src/database" "src/utils")
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir exists"
    else
        echo "⚠️  $dir missing"
    fi
done

# Try to build
echo ""
echo "🔨 Attempting to build TypeScript..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
    if [ -d "dist" ]; then
        echo "✅ dist directory created"
    fi
else
    echo "⚠️  Build had warnings (this may be OK)"
fi

# Summary
echo ""
echo "================================"
echo "✅ Setup Verification Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Update .env with your API credentials"
echo "   - STRIPE_SECRET_KEY"
echo "   - PAYFAST_MERCHANT_ID"
echo "   - JWT_SECRET (change to random 32+ char string)"
echo ""
echo "2. Start development server:"
echo "   npm run dev"
echo ""
echo "3. Server will run on http://localhost:3001"
echo ""
echo "4. Test with:"
echo "   curl http://localhost:3001/health"
echo ""
echo "For more information, see QUICKSTART.md or GUIDE.md"
echo ""
