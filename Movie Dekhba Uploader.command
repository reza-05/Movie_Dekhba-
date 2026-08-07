#!/bin/bash
# Move to the script's directory
cd "$(dirname "$0")"

clear
echo "=================================================="
echo "    STARTING MOVIE DEKHBA DESKTOP UPLOADER UI    "
echo "=================================================="
echo "Initializing local Python virtual environment..."

# Create virtual environment if it does not exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment (.venv) for packages..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies inside the virtual environment (completely bypasses system pip block!)
echo "Verifying package requirements (telethon, python-dotenv)..."
pip install -q --upgrade pip
pip install -q telethon python-dotenv

# Run the local uploader server which will automatically open in the browser
echo "Launching local server. Opening uploader web page..."
python3 local_uploader.py
