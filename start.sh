#!/bin/bash

echo "Starting PharmKo application..."

# Start backend in the background
echo "Starting Flask backend on port 8000..."
cd backend
python main.py 2>&1 | sed 's/^/[Backend] /' &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend (this will be in the foreground)
echo "Starting Vite frontend on port 5000..."
npm run dev 2>&1 | sed 's/^/[Frontend] /'

# If frontend exits, kill backend
kill $BACKEND_PID 2>/dev/null
