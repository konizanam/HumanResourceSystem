#!/bin/bash

echo "🔍 JOB BOARD API - COMPLETE TEST SUITE"
echo "======================================="
echo

# Step 1: Check if PostgreSQL is running
echo "Step 1: Checking PostgreSQL..."
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running"
    echo "   Start PostgreSQL with: sudo service postgresql start"
    exit 1
fi

# Step 2: Check if database exists
echo
echo "Step 2: Checking database..."
DB_EXISTS=$(psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='hito'" 2>/dev/null)
if [ "$DB_EXISTS" = "1" ]; then
    echo "✅ Database 'hito' exists"
else
    echo "❌ Database 'hito' does not exist"
    echo "   Create it with: createdb -U postgres hito"
    exit 1
fi

# Step 3: Check environment variables
echo
echo "Step 3: Checking environment variables..."
if [ -f .env ]; then
    echo "✅ .env file exists"
    source .env
    echo "   PORT: $PORT"
    echo "   DB_NAME: $DB_NAME"
    echo "   JWT_EXPIRES_IN: $JWT_EXPIRES_IN"
else
    echo "❌ .env file not found"
    exit 1
fi

# Step 4: Install dependencies if needed
echo
echo "Step 4: Checking dependencies..."
if [ -d node_modules ]; then
    echo "✅ node_modules exists"
else
    echo "📦 Installing dependencies..."
    npm install
fi

# Step 5: Run database test
echo
echo "Step 5: Testing database connection..."
npx ts-node test-db.ts
if [ $? -ne 0 ]; then
    echo "❌ Database test failed"
    exit 1
fi

# Step 6: Start the server in background
echo
echo "Step 6: Starting API server..."
npm run dev &
SERVER_PID=$!
sleep 5

# Step 7: Test if server is running
echo
echo "Step 7: Checking if server is running..."
if curl -s http://localhost:4000/api/v1/health > /dev/null; then
    echo "✅ Server is running on port 4000"
else
    echo "❌ Server is not running"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Step 8: Run API tests
echo
echo "Step 8: Running API tests..."
npx ts-node test-api-full.ts
TEST_RESULT=$?

# Step 9: Cleanup
echo
echo "Step 9: Cleaning up..."
kill $SERVER_PID 2>/dev/null

if [ $TEST_RESULT -eq 0 ]; then
    echo
    echo "🎉🎉🎉 ALL TESTS PASSED! 🎉🎉🎉"
    echo "================================="
    echo "Your Job Board API is working perfectly!"
else
    echo
    echo "❌ Some tests failed. Check the output above for details."
    exit 1
fi