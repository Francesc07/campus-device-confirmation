# Auth0 RBAC Permissions Quick Reference

## Required Permissions by Endpoint

### Staff Endpoints (All Require Authentication)

| HTTP Method | Endpoint | Permission | Role | Description |
|-------------|----------|------------|------|-------------|
| `POST` | `/api/confirmation/collection/confirm` | `confirm:collection` | Staff | Confirm student collected device |
| `POST` | `/api/confirmation/return/confirm` | `confirm:return` | Staff | Confirm student returned device |
| `GET` | `/api/staff/pending-loans` | `read:loans` | Staff, Manager | View all loan statuses |
| `GET` | `/api/confirmation/actions` | `read:actions` | Staff, Manager | View confirmation history |

### Public Endpoints (No Authentication)

| HTTP Method | Endpoint | Auth Required | Description |
|-------------|----------|---------------|-------------|
| `POST` | `/api/events/reservations` | ❌ No | Event Grid webhook (validated via subscription) |

---

## Auth0 Roles Configuration

### Staff Role
**Permissions Needed**:
```
confirm:collection
confirm:return
read:loans
read:actions
```

**Use Case**: Library staff who handle device checkout/return desk

### Manager Role (Read-Only)
**Permissions Needed**:
```
read:loans
read:actions
```

**Use Case**: Supervisors who need to monitor but not perform confirmations

---

## API Request Examples

### ✅ Authenticated Request (Correct)

```bash
curl -X POST https://deviceconfirmation-dev-ab07-func.azurewebsites.net/api/confirmation/collection/confirm \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "abc-123",
    "deviceId": "device-456",
    "notes": "Device in good condition"
  }'
```

**Note**: `staffId` is automatically extracted from JWT token - DO NOT include in request body!

### ❌ Unauthenticated Request (Returns 401)

```bash
curl -X POST https://deviceconfirmation-dev-ab07-func.azurewebsites.net/api/confirmation/collection/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "abc-123",
    "deviceId": "device-456"
  }'
```

**Response**:
```json
{
  "error": "Unauthorized",
  "message": "Missing bearer token"
}
```

### ❌ Insufficient Permissions (Returns 403)

User with only `read:loans` permission tries to confirm collection:

```bash
curl -X POST https://deviceconfirmation-dev-ab07-func.azurewebsites.net/api/confirmation/collection/confirm \
  -H "Authorization: Bearer <manager_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "abc-123",
    "deviceId": "device-456"
  }'
```

**Response**:
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

---

## Breaking Changes from Previous Version

### ⚠️ IMPORTANT: staffId No Longer in Request Body

**Old Behavior** (Before Auth0):
```json
{
  "staffId": "user-123",  // ❌ User could fake this
  "reservationId": "abc-123",
  "deviceId": "device-456"
}
```

**New Behavior** (With Auth0):
```json
{
  "reservationId": "abc-123",
  "deviceId": "device-456",
  "notes": "Optional notes"
}
```

The `staffId` is now automatically extracted from the JWT token's `sub` claim, preventing staffId spoofing.

### Frontend Migration

**Before**:
```typescript
fetch('/api/confirmation/collection/confirm', {
  method: 'POST',
  body: JSON.stringify({
    staffId: currentUser.id,  // ❌ Remove this
    reservationId,
    deviceId
  })
});
```

**After**:
```typescript
const token = await getAccessTokenSilently();

fetch('/api/confirmation/collection/confirm', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,  // ✅ Add this
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    // staffId removed - extracted from token
    reservationId,
    deviceId,
    notes: 'Optional'
  })
});
```

---

## Deployment Status

### ✅ Dev Environment
- **Function App**: `deviceconfirmation-dev-ab07-func`
- **Resource Group**: `CampusDeviceLender-dev-Ab07-rg`
- **Auth0 Domain**: `dev-fdcpvnabdcmjkpsd.us.auth0.com`
- **API Audience**: `https://device-confirmation-api`
- **Status**: Deployed

### ⬜ Test Environment
- **Function App**: `deviceconfirmation-test-ab07-func`
- **Resource Group**: `CampusDeviceLender-test-Ab07-rg`
- **Status**: Pending deployment
- **Command**:
```bash
az functionapp config appsettings set \
  --name deviceconfirmation-test-ab07-func \
  --resource-group CampusDeviceLender-test-Ab07-rg \
  --settings \
    TEST_AUTH0_DOMAIN="dev-fdcpvnabdcmjkpsd.us.auth0.com" \
    TEST_AUTH0_AUDIENCE="https://device-confirmation-api"
```

### ⬜ Prod Environment
- **Function App**: `deviceconfirmation-prod-ab07-func`
- **Resource Group**: `CampusDeviceLender-prod-Ab07-rg`
- **Status**: Pending deployment
- **Command**:
```bash
az functionapp config appsettings set \
  --name deviceconfirmation-prod-ab07-func \
  --resource-group CampusDeviceLender-prod-Ab07-rg \
  --settings \
    PROD_AUTH0_DOMAIN="dev-fdcpvnabdcmjkpsd.us.auth0.com" \
    PROD_AUTH0_AUDIENCE="https://device-confirmation-api"
```

---

## Testing Checklist

- [ ] Test authenticated request with valid token ✅ Should return 200
- [ ] Test unauthenticated request ✅ Should return 401
- [ ] Test with wrong audience ✅ Should return 401
- [ ] Test with expired token ✅ Should return 401
- [ ] Test Staff role with confirm:collection ✅ Should return 200
- [ ] Test Manager role with confirm:collection ✅ Should return 403
- [ ] Test Manager role with read:loans ✅ Should return 200
- [ ] Verify staffId is extracted from token ✅ Check logs
- [ ] Verify permissions array in logs ✅ Should show user's permissions

---

## Monitoring & Logs

### What to Monitor

**Successful Authentication**:
```
🔐 Authenticated staff { sub: 'auth0|69343e6c612a17aa97e819d0', permissions: ['confirm:collection', 'read:loans'] }
```

**Failed Authentication**:
```
❌ Missing or invalid Authorization header
❌ Token verification error: jwt expired
```

**Authorization Failures**:
```
❌ Missing required permissions: ['confirm:collection']
```

### Application Insights Query

```kusto
traces
| where message contains "🔐 Authenticated"
| project timestamp, message, customDimensions
| order by timestamp desc
| take 50
```

---

**Last Updated**: December 11, 2025  
**Deployed By**: GitHub Copilot  
**Status**: ✅ Active in Dev
