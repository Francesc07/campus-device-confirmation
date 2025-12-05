#!/bin/bash

# Make the file Executable
# chmod +x deploy-all.sh

# Deploy Ch
# ./deploy-all.sh



# =========================
# MULTI-ENV AZURE DEPLOY SCRIPT
# =========================

# Set your environments
DEV_RG="CampusDeviceLender-dev-Ab07-rg"
TEST_RG="CampusDeviceLender-test-Ab07-rg"
PROD_RG="CampusDeviceLender-prod-Ab07-rg"

# Declare Sevice name 
SERVICE_NAME=$"deviceconfirmation"

# Build corresponding Function App names dynamically
DEV_FUNC="${SERVICE_NAME}-dev-ab07-func"
TEST_FUNC="${SERVICE_NAME}-test-ab07-func"
PROD_FUNC="${SERVICE_NAME}-prod-ab07-func"

echo "================================================="
echo " 🚀 Deploying $SERVICE_NAME to DEV, TEST, and PROD"
echo "================================================="

echo "📦 Cleaning & Building..."
npm run clean
npm run build

echo "===================================="
echo "🌱 Deploying to DEV: $DEV_FUNC"
echo "===================================="

#echo "Waiting 20 seconds for application warm-up..."
#sleep 50
func azure functionapp publish $DEV_FUNC --typescript



echo "===================================="
echo "🧪 Deploying to TEST: $TEST_FUNC"
echo "===================================="
func azure functionapp publish $TEST_FUNC --typescript 

echo "===================================="
echo "🏭 Deploying to PROD: $PROD_FUNC"
echo "===================================="
func azure functionapp publish $PROD_FUNC --typescript 

echo "===================================="
echo "🎉 All deployments completed!"
echo "===================================="
