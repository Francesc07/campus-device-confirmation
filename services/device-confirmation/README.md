# Device Confirmation Service

> Azure Functions microservice for staff-side device collection and return confirmations.

> **📖 For project overview, setup, and deployment instructions, see the [main README](../../README.md).**

## 📋 Table of Contents

- [API Endpoints](#api-endpoints)
- [Authentication & Authorization](#authentication--authorization)
- [Data Model](#data-model)
- [Testing](#testing)
- [Environment Variables](#environment-variables)

---

## API Endpoints

### Health Check

```http
GET /api/health
Authorization: None (Anonymous)
```

**Response:**
```json
{
  "status": "healthy",
  "service": "device-confirmation",
  "timestamp": "2025-12-23T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

### Confirm Device Collection

```http
POST /api/confirmation/collection/confirm
Authorization: Bearer <jwt_token>
Required Permission: confirm:collection
```

**Request Body:**
```json
{
  "staffId": "staff-001",
  "reservationId": "res-12345",
  "deviceId": "dev-67890",
  "notes": "Device in good condition"
}
```

**Response (201 Created):**
```json
{
  "id": "action-uuid",
  "staffId": "staff-001",
  "reservationId": "res-12345",
  "deviceId": "dev-67890",
  "actionType": "Collection",
  "timestamp": "2025-12-23T10:30:00.000Z",
  "notes": "Device in good condition"
}
```

---

### Confirm Device Return

```http
POST /api/confirmation/return/confirm
Authorization: Bearer <jwt_token>
Required Permission: confirm:return
```

**Request Body:**
```json
{
  "staffId": "staff-001",
  "reservationId": "res-12345",
  "deviceId": "dev-67890",
  "notes": "Minor scratch on back panel"
}
```

**Response (201 Created):**
```json
{
  "id": "action-uuid",
  "staffId": "staff-001",
  "reservationId": "res-12345",
  "deviceId": "dev-67890",
  "actionType": "Return",
  "timestamp": "2025-12-23T14:30:00.000Z",
  "notes": "Minor scratch on back panel"
}
```

---

### List Pending Loans

```http
GET /api/staff/pending-loans
Authorization: Bearer <jwt_token>
Required Permission: read:loans
```

**Response (200 OK):**
```json
{
  "snapshots": [
    {
      "id": "snapshot-uuid",
      "reservationId": "res-12345",
      "status": "PendingReturn",
      "studentId": "student-001",
      "deviceId": "dev-67890",
      "startDate": "2025-12-20T09:00:00.000Z",
      "dueDate": "2025-12-27T09:00:00.000Z",
      "createdAt": "2025-12-20T09:00:00.000Z",
      "updatedAt": "2025-12-23T10:30:00.000Z"
    }
  ]
}
```

---

### List Confirmation Actions

```http
GET /api/confirmation/actions?reservationId=res-12345
Authorization: Bearer <jwt_token>
Required Permission: read:actions
```

**Response (200 OK):**
```json
{
  "actions": [
    {
      "id": "action-1",
      "staffId": "staff-001",
      "reservationId": "res-12345",
      "deviceId": "dev-67890",
      "actionType": "Collection",
      "timestamp": "2025-12-23T10:30:00.000Z",
      "notes": "Device in good condition"
    },
    {
      "id": "action-2",
      "staffId": "staff-001",
      "reservationId": "res-12345",
      "deviceId": "dev-67890",
      "actionType": "Return",
      "timestamp": "2025-12-23T14:30:00.000Z",
      "notes": "Minor scratch on back panel"
    }
  ]
}
```

---

## Authentication & Authorization

### Auth0 Configuration

The service uses **Auth0** for JWT-based authentication with role-based access control (RBAC).

#### Required Permissions

| Permission | Description | Endpoints |
|------------|-------------|-----------|
| `confirm:collection` | Confirm device collections | POST `/api/confirmation/collection/confirm` |
| `confirm:return` | Confirm device returns | POST `/api/confirmation/return/confirm` |
| `read:loans` | View loan statuses | GET `/api/staff/pending-loans` |
| `read:actions` | View confirmation history | GET `/api/confirmation/actions` |

#### Roles

**Staff Role**:
- Assigned to library staff members
- Includes all four permissions above

#### Token Format

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Claims:**
```json
{
  "iss": "https://dev-fdcpvnabdcmjkpsd.us.auth0.com/",
  "aud": "https://device-confirmation-api",
  "sub": "auth0|staff-001",
  "permissions": [
    "confirm:collection",
    "confirm:return",
    "read:loans",
    "read:actions"
  ]
}
```

---

## Data Model

### ConfirmationAction Entity

Represents a single staff confirmation action.

```typescript
interface ConfirmationAction {
  id: string;                    // Unique identifier (UUID)
  staffId: string;               // Staff member who performed action
  reservationId: string;         // Associated reservation
  deviceId: string;              // Device involved in action
  actionType: "Collection" | "Return";
  timestamp: string;             // ISO 8601 timestamp
  notes?: string;                // Optional staff notes
}
```

**Cosmos DB Partition Key**: `reservationId`

---

### ReservationSnapshot Entity

Point-in-time snapshot of reservation state.

```typescript
interface ReservationSnapshot {
  id: string;                    // Unique snapshot ID
  reservationId: string;         // Original reservation ID
  status: "PendingCollection" | "Collected" | "PendingReturn" | "Returned";
  studentId: string;             // Student who made reservation
  deviceId: string;              // Reserved device
  startDate: string;             // Reservation start (ISO 8601)
  dueDate: string;               // Reservation due date (ISO 8601)
  createdAt: string;             // Snapshot creation time
  updatedAt: string;             // Last update time
}
```

**Cosmos DB Partition Key**: `reservationId`

**Status Transitions:**
```
PendingCollection → Collected → PendingReturn → Returned
```

---

## Testing

Run the test suite:

```bash
# Run all unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- ConfirmCollectionUseCase.test.ts

# Watch mode
npm test -- --watch
```

### Test Coverage

- **Total Tests**: 86+ unit tests
- **Coverage**: ~75% (use cases and domain logic)
- **Test Suites**: Domain entities, use cases, infrastructure

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `COSMOS_DB_CONNECTION_STRING` | Azure Cosmos DB connection string | `AccountEndpoint=https://...` |
| `COSMOS_DB_DATABASE_NAME` | Database name | `DeviceConfirmationDB` |
| `COSMOS_DB_CONTAINER_NAME` | Container name | `Confirmations` |
| `EVENTGRID_TOPIC_ENDPOINT` | Event Grid topic endpoint | `https://....eventgrid.azure.net/api/events` |
| `EVENTGRID_TOPIC_KEY` | Event Grid access key | `abc123...` |
| `AUTH0_DOMAIN` | Auth0 tenant domain | `dev-xyz.us.auth0.com` |
| `AUTH0_AUDIENCE` | Auth0 API identifier | `https://device-confirmation-api` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment name | `dev-local` |
| `FUNCTIONS_WORKER_RUNTIME` | Azure Functions runtime | `node` |

> **⚠️ Security**: All secrets must be stored in Azure Application Settings. The `local.settings.json` file is git-ignored and contains placeholders only.

---

**For setup, deployment, and monitoring instructions, see the [main README](../../README.md).**
