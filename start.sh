#!/bin/bash

set -e

echo "Starting backend..."
(cd src/backend && ./gradlew bootRun) &
BACKEND_PID=$!

echo "Waiting for backend on port 8080..."
until nc -z localhost 8080 2>/dev/null; do
  sleep 2
done

echo "Starting frontend..."
(cd src/frontend && npm run dev) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
