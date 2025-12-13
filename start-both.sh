#!/bin/bash
# Start both ChoreStar versions for simultaneous testing
# This script starts the React and Vanilla JS versions AND a proxy that routes between them

echo "🚀 Starting ChoreStar dual development environment..."
echo ""

# Start Next.js React version on port 3000
echo "📱 Starting React/Next.js version on http://localhost:3000..."
cd chorestar-nextjs && npm run dev > /dev/null 2>&1 &
NEXTJS_PID=$!

# Wait a moment for Next.js to initialize
sleep 2

# Start Vanilla JS version on port 8080
echo "📄 Starting Vanilla JS version on http://localhost:8080..."
cd ../frontend && python3 -m http.server 8080 > /dev/null 2>&1 &
VANILLA_PID=$!

# Wait for static server to start
sleep 1

# Start the proxy on port 3001
echo "🔀 Starting routing proxy on http://localhost:3001..."
cd .. && node local-proxy.js &
PROXY_PID=$!

# Wait for proxy to start
sleep 2

echo ""
echo "✅ All services started!"
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🎯 ChoreStar Development Environment                         ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║  👉 USE THIS: http://localhost:3001                          ║"
echo "║                                                               ║"
echo "║  This proxy routes like production:                          ║"
echo "║    • /app/*  → React/Next.js version                         ║"
echo "║    • /*      → Vanilla JS version                            ║"
echo "║                                                               ║"
echo "║  Individual services (for debugging):                        ║"
echo "║    • http://localhost:3000  (React/Next.js only)             ║"
echo "║    • http://localhost:8080  (Vanilla JS only)                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $NEXTJS_PID $VANILLA_PID $PROXY_PID 2>/dev/null
    exit 0
}

trap cleanup INT

# Wait for all processes
wait $NEXTJS_PID $VANILLA_PID $PROXY_PID
