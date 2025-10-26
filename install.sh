#!/bin/bash
# BlockedAds Easy Installer
# Makes installing BlockedAds as easy as uBlock Origin

echo "🛡️ BlockedAds Easy Installer"
echo "=============================="
echo ""
echo "This script will help you install BlockedAds just like uBlock Origin!"
echo ""

# Check if Chrome is installed
if command -v google-chrome &> /dev/null || command -v chromium-browser &> /dev/null; then
    echo "✅ Chrome/Chromium detected"
    CHROME_FOUND=true
else
    echo "❌ Chrome/Chromium not found"
    echo "Please install Chrome or Chromium first"
    CHROME_FOUND=false
fi

# Check if we're in the right directory
if [ ! -d "blockedads-mvp-chrome" ]; then
    echo "❌ blockedads-mvp-chrome directory not found"
    echo "Please run this script from the BlockedAds root directory"
    exit 1
fi

echo ""
echo "📦 Preparing BlockedAds Chrome Extension..."
echo ""

# Create a simple installation guide
cat > INSTALL_CHROME.md << 'EOF'
# 🚀 BlockedAds Chrome Extension Installation

## Quick Install (Like uBlock Origin)

1. **Open Chrome Extensions**:
   - Type `chrome://extensions/` in your address bar
   - Or go to Chrome Menu → More Tools → Extensions

2. **Enable Developer Mode**:
   - Toggle "Developer mode" ON (top right corner)

3. **Load BlockedAds**:
   - Click "Load unpacked"
   - Select the `blockedads-mvp-chrome` folder
   - Click "Select Folder"

4. **Start Blocking Ads**:
   - Visit any website with ads
   - Click the BlockedAds icon in your toolbar
   - See real-time statistics!

## Features (uBlock Origin Compatible)
- ✅ Blocks ads, trackers, and popups
- ✅ YouTube ad blocking
- ✅ Real-time statistics
- ✅ Whitelist management
- ✅ Fast and lean performance
- ✅ EasyList filter support

## Troubleshooting
- If ads still show, refresh the page
- Check that BlockedAds is enabled in extensions
- Try disabling other ad blockers to avoid conflicts

Enjoy your ad-free browsing! 🎉
EOF

echo "✅ Installation guide created: INSTALL_CHROME.md"
echo ""

if [ "$CHROME_FOUND" = true ]; then
    echo "🌐 Opening Chrome Extensions page..."
    
    # Try to open Chrome extensions page
    if command -v google-chrome &> /dev/null; then
        google-chrome chrome://extensions/ 2>/dev/null &
    elif command -v chromium-browser &> /dev/null; then
        chromium-browser chrome://extensions/ 2>/dev/null &
    fi
    
    echo ""
    echo "📋 Next Steps:"
    echo "1. Chrome should now be open to the Extensions page"
    echo "2. Enable 'Developer mode' (toggle in top right)"
    echo "3. Click 'Load unpacked'"
    echo "4. Select the 'blockedads-mvp-chrome' folder"
    echo "5. Start blocking ads!"
    echo ""
    echo "📖 For detailed instructions, see: INSTALL_CHROME.md"
else
    echo "📖 Please see INSTALL_CHROME.md for manual installation instructions"
fi

echo ""
echo "🎉 BlockedAds is ready to install!"
echo "🛡️ Enjoy ad-free browsing like uBlock Origin!"
echo ""
echo "Need help? Check the README.md or open an issue on GitHub"
