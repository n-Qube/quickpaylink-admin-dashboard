#!/bin/bash

cd /Users/danielnortey/Documents/workspace/quickpaylink/admin-dashboard

echo "🚀 Deploying processManualPayout function..."
echo ""

firebase deploy --only functions:processManualPayout

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "The processManualPayout function is now live and the 'internal' error should be fixed."
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
fi
