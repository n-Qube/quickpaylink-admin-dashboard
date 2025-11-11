#!/bin/bash

# This script will authenticate with Firebase and deploy the processManualPayout function

echo "🔐 Opening browser for Firebase authentication..."
echo ""
echo "Please sign in to Firebase in the browser window that will open."
echo ""

# Open the terminal and run firebase login
open -a Terminal.app

# Create a temporary script to run in the new terminal
cat > /tmp/firebase-deploy.sh << 'EOF'
#!/bin/bash

echo "=================================="
echo "Firebase Function Deployment"
echo "=================================="
echo ""
echo "Step 1: Authenticating with Firebase..."
echo ""

# Change to the project directory
cd /Users/danielnortey/Documents/workspace/quickpaylink/admin-dashboard

# Login to Firebase (will open browser)
firebase login --reauth

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Authentication successful!"
    echo ""
    echo "Step 2: Deploying processManualPayout function..."
    echo ""

    # Deploy the function
    firebase deploy --only functions:processManualPayout

    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Deployment successful!"
        echo ""
        echo "The processManualPayout function is now live."
        echo "You can close this window."
    else
        echo ""
        echo "❌ Deployment failed. Please check the error messages above."
    fi
else
    echo ""
    echo "❌ Authentication failed. Please try again."
fi

echo ""
echo "Press any key to close this window..."
read -n 1

EOF

# Make the script executable
chmod +x /tmp/firebase-deploy.sh

# Run the script in a new Terminal window
osascript -e 'tell application "Terminal" to do script "/tmp/firebase-deploy.sh"'

echo "✅ A new Terminal window will open for authentication and deployment."
echo ""
echo "Please follow the instructions in that window."
