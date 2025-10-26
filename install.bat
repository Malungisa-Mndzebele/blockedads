@echo off
REM BlockedAds Easy Installer for Windows
REM Makes installing BlockedAds as easy as uBlock Origin

echo.
echo 🛡️ BlockedAds Easy Installer for Windows
echo ========================================
echo.
echo This script will help you install BlockedAds just like uBlock Origin!
echo.

REM Check if Chrome is installed
where chrome >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Chrome detected
    set CHROME_FOUND=true
) else (
    echo ❌ Chrome not found
    echo Please install Chrome first
    set CHROME_FOUND=false
)

REM Check if we're in the right directory
if not exist "blockedads-mvp-chrome" (
    echo ❌ blockedads-mvp-chrome directory not found
    echo Please run this script from the BlockedAds root directory
    pause
    exit /b 1
)

echo.
echo 📦 Preparing BlockedAds Chrome Extension...
echo.

REM Create installation guide
(
echo # 🚀 BlockedAds Chrome Extension Installation
echo.
echo ## Quick Install ^(Like uBlock Origin^)
echo.
echo 1. **Open Chrome Extensions**:
echo    - Type `chrome://extensions/` in your address bar
echo    - Or go to Chrome Menu → More Tools → Extensions
echo.
echo 2. **Enable Developer Mode**:
echo    - Toggle "Developer mode" ON ^(top right corner^)
echo.
echo 3. **Load BlockedAds**:
echo    - Click "Load unpacked"
echo    - Select the `blockedads-mvp-chrome` folder
echo    - Click "Select Folder"
echo.
echo 4. **Start Blocking Ads**:
echo    - Visit any website with ads
echo    - Click the BlockedAds icon in your toolbar
echo    - See real-time statistics!
echo.
echo ## Features ^(uBlock Origin Compatible^)
echo - ✅ Blocks ads, trackers, and popups
echo - ✅ YouTube ad blocking
echo - ✅ Real-time statistics
echo - ✅ Whitelist management
echo - ✅ Fast and lean performance
echo - ✅ EasyList filter support
echo.
echo ## Troubleshooting
echo - If ads still show, refresh the page
echo - Check that BlockedAds is enabled in extensions
echo - Try disabling other ad blockers to avoid conflicts
echo.
echo Enjoy your ad-free browsing! 🎉
) > INSTALL_CHROME.md

echo ✅ Installation guide created: INSTALL_CHROME.md
echo.

if "%CHROME_FOUND%"=="true" (
    echo 🌐 Opening Chrome Extensions page...
    start chrome chrome://extensions/
    echo.
    echo 📋 Next Steps:
    echo 1. Chrome should now be open to the Extensions page
    echo 2. Enable 'Developer mode' ^(toggle in top right^)
    echo 3. Click 'Load unpacked'
    echo 4. Select the 'blockedads-mvp-chrome' folder
    echo 5. Start blocking ads!
    echo.
    echo 📖 For detailed instructions, see: INSTALL_CHROME.md
) else (
    echo 📖 Please see INSTALL_CHROME.md for manual installation instructions
)

echo.
echo 🎉 BlockedAds is ready to install!
echo 🛡️ Enjoy ad-free browsing like uBlock Origin!
echo.
echo Need help? Check the README.md or open an issue on GitHub
echo.
pause
