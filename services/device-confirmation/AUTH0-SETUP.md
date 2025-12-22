# Auth0 Authentication & RBAC Implementation

**Date**: December 11, 2025  
**Status**: ✅ Implemented  
**Endpoints Secured**: 4 staff endpoints

---

## Overview

All staff endpoints now require **Auth0 JWT authentication** with **role-based access control (RBAC)** using permissions.

### Protected Endpoints

| Endpoint | Method | Route | Required Permission | Description |
|----------|--------|-------|---------------------|-------------|
| `confirm-collection-http` | POST | `/api/confirmation/collection/confirm` | `confirm:collection` | Confirm device collection |
| `confirm-return-http` | POST | `/api/confirmation/return/confirm` | `confirm:return` | Confirm device return |
| `list-pending-loans-http` | GET | `/api/staff/pending-loans` | `read:loans` | List all loan statuses |
| `list-confirmation-actions-http` | GET | `/api/confirmation/actions` | `read:actions` | List confirmation history |

---

## Auth0 Configuration

### Environment Variables

**Local Development** (`local.settings.json`):
```json
{
  "AUTH0_DOMAIN": "dev-fdcpvnabdcmjkpsd.us.auth0.com",
  "AUTH0_AUDIENCE": "https://device-confirmation-api"
}
```

**Azure Function App Settings**:
```bash
# Dev environment
az functionapp config appsettings set \
  --name deviceconfirmation-dev-ab07-func \
  --resource-group deviceconfirmation-dev-ab07-rg \
  --settings \
    AUTH0_DOMAIN="dev-fdcpvnabdcmjkpsd.us.auth0.com" \
    AUTH0_AUDIENCE="https://device-confirmation-api"

# Test environment (use TEST_ prefix)
az functionapp config appsettings set \
  --name deviceconfirmation-test-ab07-func \
  --resource-group deviceconfirmation-test-ab07-rg \
  --settings \
    TEST_AUTH0_DOMAIN="dev-fdcpvnabdcmjkpsd.us.auth0.com" \
    TEST_AUTH0_AUDIENCE="https://device-confirmation-api"

# Production environment (use PROD_ prefix)
az functionapp config appsettings set \
  --name deviceconfirmation-prod-ab07-func \
  --resource-group deviceconfirmation-prod-ab07-rg \
  --settings \
    PROD_AUTH0_DOMAIN="dev-fdcpvnabdcmjkpsd.us.auth0.com" \
    PROD_AUTH0_AUDIENCE="https://device-confirmation-api"
```

---

## Auth0 Setup Guide

### 1. Create API in Auth0

1. Log in to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **Applications** → **APIs**
3. Click **Create API**
4. Configure:
   - **Name**: Device Confirmation API
   - **Identifier**: `https://device-confirmation-api`
   - **Signing Algorithm**: RS256
5. Click **Create**

### 2. Define Permissions

In your API settings, add these permissions:

| Permission | Description |
|------------|-------------|
| `confirm:collection` | Confirm device collection from student |
| `confirm:return` | Confirm device return from student |
| `read:loans` | View pending/collected/returned loans |
| `read:actions` | View confirmation action history |

### 3. Create Roles

Navigate to **User Management** → **Roles**, create:

#### Staff Role
- **Name**: `Staff`
- **Description**: Library staff member who handles device confirmations
- **Permissions**:
  - ✅ `confirm:collection`
  - ✅ `confirm:return`
  - ✅ `read:loans`
  - ✅ `read:actions`

#### Manager Role (Optional)
- **Name**: `Manager`
- **Description**: Manager with read-only access
- **Permissions**:
  - ✅ `read:loans`
  - ✅ `read:actions`

### 4. Assign Roles to Users

1. Navigate to **User Management** → **Users**
2. Select a user
3. Click **Roles** tab
4. Click **Assign Roles**
5. Select `Staff` or `Manager`
6. Click **Assign**

### 5. Configure Application (Frontend)

1. Navigate to **Applications** → **Applications**
2. Create a **Single Page Application**
3. Configure:
   - **Name**: Campus Device Portal
   - **Allowed Callback URLs**: `http://localhost:5173/callback`
   - **Allowed Logout URLs**: `http://localhost:5173`
   - **Allowed Web Origins**: `http://localhost:5173`
   - **Allowed Origins (CORS)**: `http://localhost:5173`

4. In **Settings** → **Advanced Settings** → **Grant Types**, enable:
   - ✅ Authorization Code
   - ✅ Refresh Token

---

## API Usage

### 1. Obtain Access Token

**Client Credentials Flow** (M2M - for testing):
```bash
curl --request POST \
  --url https://dev-fdcpvnabdcmjkpsd.us.auth0.com/oauth/token \
  --header 'content-type: application/json' \
  --data '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "audience": "https://device-confirmation-api",
    "grant_type": "client_credentials"
  }'
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEyMzQ1Njc4OTAifQ...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

### 2. Call Protected Endpoints

**Confirm Collection**:
```bash
curl -X POST https://deviceconfirmation-dev-ab07-func.azurewebsites.net/api/confirmation/collection/confirm \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "dc193d5b-ae2b-4368-96d4-d859806dde07",
    "deviceId": "b052422d-9128-4e53-b4d9-e503df9a3d04",
    "notes": "Device in good condition"
  }'
```

**Note**: `staffId` is now automatically extracted from the JWT token (`sub` claim), no need to send it in the request body.

**List Pending Loans**:
```bash
curl -X GET "https://deviceconfirmation-dev-ab07-func.azurewebsites.net/api/staff/pending-loans?status=all" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Error Responses

### 401 Unauthorized

**Missing Token**:
```json
{
  "error": "Unauthorized",
  "message": "Missing bearer token"
}
```

**Invalid Token**:
```json
{
  "error": "Unauthorized",
  "message": "Invalid token"
}
```

### 403 Forbidden

**Insufficient Permissions**:
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

---

## Frontend Integration

### React Example (Auth0 React SDK)

```typescript
import { useAuth0 } from '@auth0/auth0-react';

function ConfirmCollectionButton({ reservationId, deviceId }) {
  const { getAccessTokenSilently } = useAuth0();

  const handleConfirm = async () => {
    try {
      // Get access token
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://device-confirmation-api',
          scope: 'confirm:collection'
        }
      });

      // Call API
      const response = await fetch(
        'https://deviceconfirmation-dev-ab07-func.azurewebsites.net/api/confirmation/collection/confirm',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reservationId,
            deviceId,
            notes: 'Confirmed via portal'
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('Collection confirmed:', result);
      } else if (response.status === 403) {
        alert('You do not have permission to confirm collections');
      } else if (response.status === 401) {
        alert('Please log in again');
      }
    } catch (error) {
      console.error('Error confirming collection:', error);
    }
  };

  return <button onClick={handleConfirm}>Confirm Collection</button>;
}
```

### Auth0Provider Setup

```typescript
import { Auth0Provider } from '@auth0/auth0-react';

function App() {
  return (
    <Auth0Provider
      domain="dev-fdcpvnabdcmjkpsd.us.auth0.com"
      clientId="YOUR_CLIENT_ID"
      authorizationParams={{
        redirect_uri: window.location.origin + '/callback',
        audience: 'https://device-confirmation-api',
        scope: 'openid profile email confirm:collection confirm:return read:loans read:actions'
      }}
    >
      {/* Your app */}
    </Auth0Provider>
  );
}
```

---

## Testing

### Manual Testing with cURL

**1. Get Token** (using M2M app):
```bash
TOKEN=$(curl -s --request POST \
  --url https://dev-fdcpvnabdcmjkpsd.us.auth0.com/oauth/token \
  --header 'content-type: application/json' \
  --data '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "audience": "https://device-confirmation-api",
    "grant_type": "client_credentials"
  }' | jq -r '.access_token')

echo "Token: $TOKEN"
```

**2. Test Endpoint**:
```bash
curl -X GET "https://deviceconfirmation-dev-ab07-func.azurewebsites.net/api/staff/pending-loans?status=all" \
  -H "Authorization: Bearer $TOKEN" \
  -v
```

**3. Test Without Token** (should fail with 401):
```bash
curl -X GET "https://deviceconfirmation-dev-ab07-func.azurewebsites.net/api/staff/pending-loans?status=all" \
  -v
```

**4. Decode Token** (verify permissions):
```bash
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

Expected JWT payload:
```json
{
  "iss": "https://dev-fdcpvnabdcmjkpsd.us.auth0.com/",
  "sub": "auth0|69343e6c612a17aa97e819d0",
  "aud": "https://device-confirmation-api",
  "permissions": [
    "confirm:collection",
    "confirm:return",
    "read:loans",
    "read:actions"
  ],
  "exp": 1765435319,
  "iat": 1765348919
}
```

---

## Code Changes

### Files Modified

1. **`local.settings.json`** - Added Auth0 environment variables
2. **`src/Infrastructure/Config/environment.ts`** - Added auth0 config
3. **`src/Infrastructure/Auth/auth0Validation.ts`** - Updated to use environment config
4. **`src/API/functions/confirm-collection-http.ts`** - Added authentication
5. **`src/API/functions/confirm-return-http.ts`** - Added authentication
6. **`src/API/functions/list-pending-loans-http.ts`** - Added authentication
7. **`src/API/functions/list-confirmation-actions-http.ts`** - Added authentication

### Key Features

#### 1. JWT Validation
- ✅ RS256 algorithm (asymmetric signing)
- ✅ Validates issuer (`https://dev-fdcpvnabdcmjkpsd.us.auth0.com/`)
- ✅ Validates audience (`https://device-confirmation-api`)
- ✅ Uses JWKS for public key retrieval
- ✅ Automatic token expiration checking

#### 2. Permission-Based Access Control
- ✅ Each endpoint requires specific permissions
- ✅ Permissions checked from JWT `permissions` claim
- ✅ Returns 403 if missing required permissions

#### 3. Automatic staffId Extraction
- ✅ No longer need to send `staffId` in request body
- ✅ Extracted from JWT `sub` claim (Auth0 user ID)
- ✅ Prevents staffId spoofing

#### 4. Comprehensive Error Handling
- ✅ 401 for missing/invalid tokens
- ✅ 403 for insufficient permissions
- ✅ Detailed logging for debugging

---

## Security Best Practices

### ✅ Implemented

1. **Token Validation**: All tokens verified using Auth0's public keys
2. **Permission Checking**: RBAC enforced at API level
3. **Automatic staffId**: No user-supplied staffId accepted
4. **HTTPS Only**: All traffic encrypted (Azure Functions default)
5. **Token Expiration**: Short-lived tokens (24 hours default)

### 🔄 Recommended Additions

1. **Rate Limiting**: Add throttling to prevent abuse
2. **Audit Logging**: Log all authenticated actions
3. **Token Revocation**: Implement token blacklist for logout
4. **IP Whitelisting**: Restrict access to known networks (optional)
5. **MFA Enforcement**: Require multi-factor auth for staff accounts

---

## Troubleshooting

### "Missing or invalid Authorization header"
- Ensure `Authorization: Bearer <token>` header is present
- Check for typos in header name (case-insensitive but should be "Authorization")

### "Invalid token"
- Token may be expired (check `exp` claim)
- Token may be for wrong audience
- JWKS endpoint may be unreachable
- Check Auth0 domain configuration

### "Insufficient permissions"
- User's role doesn't include required permission
- Check user's assigned roles in Auth0 dashboard
- Verify API permissions are configured correctly

### "Token verification failed"
- Check AUTH0_DOMAIN environment variable
- Check AUTH0_AUDIENCE environment variable
- Ensure Auth0 API is configured with RS256 algorithm

---

## Deployment Checklist

- [ ] Add `AUTH0_DOMAIN` to Azure Function App Settings (all environments)
- [ ] Add `AUTH0_AUDIENCE` to Azure Function App Settings (all environments)
- [ ] Create API in Auth0 dashboard
- [ ] Configure permissions in Auth0 API
- [ ] Create Staff role with permissions
- [ ] Assign role to test users
- [ ] Update frontend to request Auth0 tokens
- [ ] Test all endpoints with valid tokens
- [ ] Test all endpoints without tokens (should return 401)
- [ ] Test with insufficient permissions (should return 403)

---

## Next Steps

1. Deploy to Azure with environment variables
2. Test authentication flow end-to-end
3. Update frontend to integrate Auth0 React SDK
4. Document staff onboarding process
5. Set up monitoring for authentication failures
6. Consider implementing refresh token rotation

---

**Implemented By**: GitHub Copilot  
**Compilation**: ✅ Successful  
**Ready for Deployment**: ✅ Yes
