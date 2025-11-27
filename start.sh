#!/bin/bash

# Start backend in the background
cd backend
python main.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend (this will be in the foreground)
npm run dev

# If frontend exits, kill backend
kill $BACKEND_PID 2>/dev/null
