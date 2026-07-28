#!/bin/bash

# Port to run the server on
PORT=8080

# Check if npx and serve are available
if command -v npx &> /dev/null
then
    echo "Starting luxury server with npx..."
    npx -y serve -p $PORT .
    exit 0
fi

# Fallback to python3
if command -v python3 &> /dev/null
then
    echo "Starting luxury server with Python 3..."
    python3 -m http.server $PORT
    exit 0
fi

# Fallback to python2
if command -v python &> /dev/null
then
    echo "Starting luxury server with Python 2..."
    python -m SimpleHTTPServer $PORT
    exit 0
fi

echo "ERROR: No local server found (npx, python3, or python). Please install one of these to run the 3D modules."
exit 1
