#!/bin/bash

# ============================
#   MULTI-ENV LOCAL SETTINGS POPULATOR
# ============================
# Make the file executable
# chmod +x populate-env.sh

# Usage:
#   ./populate-env.sh dev
#   ./populate-env.sh test
#   ./populate-env.sh prod

ENVIRONMENT=$1

if [[ -z "$ENVIRONMENT" ]]; then
  echo "❌ ERROR: Please provide an environment: dev | test | prod"
  exit 1
fi

# Validate env
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "test" && "$ENVIRONMENT" != "prod" ]]; then
  echo "❌ ERROR: Invalid environment. Choose dev | test | prod"
  exit 1
fi

# ============================
# CONFIGURATION (UPDATE PER SERVICE)
# ============================

# ============================
# CONFIRMATION SERVICE CONFIG
# ============================

SERVICE_NAME1="deviceconf"     
SERVICE_NAME="deviceconfirmation"     
DB_NAME="DeviceConfirmationDB"      
CONTAINER_NAME="StaffActions"        
       

# ============================
# AUTO BUILD RESOURCE NAMES
# ============================

RG="CampusDeviceLender-$ENVIRONMENT-Ab07-rg"
COSMOS="${SERVICE_NAME}-${ENVIRONMENT}-ab07-cosmos"
STORAGE="${SERVICE_NAME1}${ENVIRONMENT}ab07sa"
TOPIC="${SERVICE_NAME}-${ENVIRONMENT}-ab07-topic"
LOCAL_SETTINGS="./local.settings.json"

echo "🔍 Environment........: $ENVIRONMENT"
echo "🔍 Resource Group.....: $RG"
echo "🔍 Cosmos Account.....: $COSMOS"
echo "🔍 Storage Account....: $STORAGE"
echo "🔍 Event Topic........: $TOPIC"
echo ""

# ============================
# FETCH CREDENTIALS
# ============================

echo "🔄 Fetching Cosmos DB connection string..."
COSMOS_CONN=$(az cosmosdb keys list \
  --name $COSMOS \
  --resource-group $RG \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv)

if [[ -z "$COSMOS_CONN" ]]; then
  echo "❌ ERROR: Could not fetch Cosmos DB credentials"
  exit 1
fi

echo "🔄 Fetching Storage Account connection string..."
STORAGE_CONN=$(az storage account show-connection-string \
  --name $STORAGE \
  --resource-group $RG \
  --query connectionString -o tsv)

if [[ -z "$STORAGE_CONN" ]]; then
  echo "❌ ERROR: Could not fetch storage credentials"
  exit 1
fi

echo "🔄 Fetching Event Grid topic endpoint..."
TOPIC_ENDPOINT=$(az eventgrid topic show \
  --name $TOPIC \
  --resource-group $RG \
  --query endpoint -o tsv)

echo "🔄 Fetching Event Grid topic key..."
TOPIC_KEY=$(az eventgrid topic key list \
  --name $TOPIC \
  --resource-group $RG \
  --query key1 -o tsv)

if [[ -z "$TOPIC_KEY" ]]; then
  echo "❌ ERROR: Could not fetch Event Grid topic key"
  exit 1
fi

# ============================
# WRITE LOCAL SETTINGS
# ============================

echo "📝 Writing local.settings.json..."

cat > $LOCAL_SETTINGS <<EOF
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "ENVIRONMENT": "$ENVIRONMENT-local",

    "COSMOS_DB_CONNECTION_STRING": "$COSMOS_CONN",
    "COSMOS_DB_DATABASE_NAME": "$DB_NAME",
    "COSMOS_DB_CONTAINER_NAME": "$CONTAINER_NAME",

    "AZURE_STORAGE_CONNECTION_STRING": "$STORAGE_CONN",

    "EVENTGRID_TOPIC_ENDPOINT": "$TOPIC_ENDPOINT",
    "EVENTGRID_TOPIC_KEY": "$TOPIC_KEY"
  }
}
EOF

echo "✅ SUCCESS: local.settings.json generated for $ENVIRONMENT"
echo "📁 Saved to: $LOCAL_SETTINGS"
