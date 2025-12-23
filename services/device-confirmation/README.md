# Device Confirmation Service

> A microservice for confirming device collection and return in the Campus Device Lending system.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Authentication & Authorization](#authentication--authorization)
- [Local Development](#local-development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Data Model](#data-model)

---

## Overview

The Device Confirmation Service handles staff-side operations for confirming device collections and returns. It maintains a record of confirmation actions and snapshot state of reservations to ensure data consistency and auditability.

### Key Responsibilities

- **Confirm Device Collection**: Staff confirms a student has collected their reserved device
- **Confirm Device Return**: Staff confirms a student has returned a device
- **Track Confirmation Actions**: Maintains an audit log of all staff confirmation activities
- **Snapshot Management**: Creates point-in-time snapshots of reservation state
- **Event Publishing**: Publishes domain events to Event Grid for downstream services

### Technology Stack

- **Runtime**: Azure Functions (Node.js 22.x)
- **Language**: TypeScript
- **Database**: Azure Cosmos DB (NoSQL)
- **Event Messaging**: Azure Event Grid
- **Authentication**: Auth0 (JWT + RBAC)
- **Testing**: Jest
- **CI/CD**: GitHub Actions

---

## Architecture

### Clean Architecture Layers

```
src/
├── API/                           # Presentation Layer
│   └── functions/                 # HTTP & Event Grid endpoints
│       ├── health-check-http.ts
│       ├── confirm-collection-http.ts
│       ├── confirm-return-http.ts
│       ├── list-confirmation-actions-http.ts
│       ├── list-pending-loans-http.ts
│       └── reservation-events-http.ts
│
├── Application/                   # Application Layer
│   ├── UseCases/                  # Business use cases
│   │   ├── ConfirmCollectionUseCase.ts
│   │   ├── ConfirmReturnUseCase.ts
│   │   └── ListConfirmationActionsUseCase.ts
│   ├── Handlers/                  # Request/response handlers
│   ├── Dtos/                      # Data transfer objects
│   └── Interfaces/                # Repository abstractions
│
├── Domain/                        # Domain Layer
│   ├── Entities/                  # Core business entities
│   │   ├── ConfirmationAction.ts
│   │   └── ReservationSnapshot.ts
│   ├── Enums/
│   │   └── ConfirmationActionType.ts
│   └── Events/                    # Domain events
│       ├── ConfirmationCollectedEvent.ts
│       └── ConfirmationReturnedEvent.ts
│
└── Infrastructure/                # Infrastructure Layer
    ├── Auth/                      # Auth0 JWT validation
    ├── Config/                    # Environment & Cosmos setup
    ├── EventGrid/                 # Event publishing
    └── Persistence/               # Cosmos DB repositories
```

### Design Principles

- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Single Responsibility**: Each class has one reason to change
- **Testability**: All dependencies are mockable via interfaces
- **Domain-Driven Design**: Rich domain models with business logic

---

## Features

### ✅ Core Features

- **Staff Confirmation Workflows**
  - Confirm device collection with validation
  - Confirm device return with optional damage notes
  - Idempotent operations (duplicate requests handled gracefully)

- **Audit Trail**
  - Every confirmation action is logged permanently
  - Includes staff ID, timestamp, device/reservation IDs
  - Queryable confirmation history

- **State Management**
  - Point-in-time snapshots of reservation state
  - Status transitions: PendingCollection → Collected → PendingReturn → Returned
  - Prevents invalid state transitions

- **Event-Driven Integration**
  - Publishes `Confirmation.Collected` events
  - Publishes `Confirmation.Returned` events
  - Enables downstream services to react (e.g., send notifications)

- **Security**
  - Auth0 JWT authentication
  - Role-based access control (RBAC)
  - Permission-based endpoint protection

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

#### Environment Variables

```bash
AUTH0_DOMAIN=dev-fdcpvnabdcmjkpsd.us.auth0.com
AUTH0_AUDIENCE=https://device-confirmation-api
```

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

## Local Development

### Prerequisites

- Node.js 22.x
- Azure Functions Core Tools v4
- Azure Cosmos DB Emulator (or cloud instance)
- Auth0 account (for authentication)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Francesc07/campus-device-confirmation.git
   cd campus-device-confirmation/services/device-confirmation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure local settings**
   
   Copy `local.settings.json.example` (if exists) or create `local.settings.json`:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "ENVIRONMENT": "dev-local",
       
       "COSMOS_DB_CONNECTION_STRING": "<your-cosmos-connection-string>",
       "COSMOS_DB_DATABASE_NAME": "DeviceConfirmationDB",
       "COSMOS_DB_CONTAINER_NAME": "Confirmations",
       
       "EVENTGRID_TOPIC_ENDPOINT": "<your-eventgrid-endpoint>",
       "EVENTGRID_TOPIC_KEY": "<your-eventgrid-key>",
       
       "AUTH0_DOMAIN": "dev-fdcpvnabdcmjkpsd.us.auth0.com",
       "AUTH0_AUDIENCE": "https://device-confirmation-api"
     }
   }
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run locally**
   ```bash
   npm start
   # or
   func start
   ```

6. **Access the service**
   - Health Check: http://localhost:7071/api/health
   - Endpoints available at: http://localhost:7071/api/*

---

## Testing

### Test Suite Overview

- **Total Tests**: 86+ unit tests
- **Test Suites**: 6 (5 unit + 1 integration)
- **Coverage**: ~75% (use cases and domain logic)
- **Frameworks**: Jest, TypeScript

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- ConfirmCollectionUseCase.test.ts

# Run tests in watch mode
npm test -- --watch

# CI mode (no watch, maxWorkers=2)
npm test -- --ci --maxWorkers=2
```

### Test Categories

#### 1. Domain Entity Tests (28 tests)
- `ConfirmationAction.test.ts`: Entity validation, business rules
- `ReservationSnapshot.test.ts`: State transitions, timestamp validation

#### 2. Use Case Tests (42 tests)
- `ConfirmCollectionUseCase.test.ts`: Collection workflow, validation
- `ConfirmReturnUseCase.test.ts`: Return workflow, error handling
- `IdempotencyAndConcurrency.test.ts`: Duplicate requests, race conditions

#### 3. Infrastructure Tests (13 tests)
- `ConfirmationEventPublisher.test.ts`: Event Grid publishing

#### 4. Integration Tests (Skipped by default)
- `CosmosRepositories.integration.test.ts`: Real Cosmos DB operations
- Run with: `INTEGRATION_TEST=true npm test`

### Test Evidence

All tests pass successfully in CI/CD pipeline:
- ✅ 86 unit tests passed
- ✅ 8 integration tests skipped (by design)
- ✅ Zero test failures

---

## Deployment

### CI/CD Pipeline

The service uses **GitHub Actions** for automated testing and deployment.

#### Workflow: `device-confirmation-ci.yml`

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual trigger via `workflow_dispatch`

**Pipeline Stages:**

1. **Test** → Run all unit tests with coverage
2. **Build** → Compile TypeScript, package dependencies
3. **Deploy DEV** → Auto-deploy to DEV environment (on `develop` branch)
4. **Deploy TEST** → Auto-deploy to TEST environment (on `develop` branch)
5. **Deploy PROD** → Manual trigger only, requires approval

#### Environments

| Environment | URL | Auto-Deploy | Approval Required |
|-------------|-----|-------------|-------------------|
| **DEV** | https://deviceconfirmation-dev-ab07-func.azurewebsites.net | ✅ Yes (develop branch) | ❌ No |
| **TEST** | https://deviceconfirmation-test-ab07-func.azurewebsites.net | ✅ Yes (develop branch) | ❌ No |
| **PROD** | https://deviceconfirmation-prod-ab07-func.azurewebsites.net | ❌ Manual only | ✅ Yes |

#### Manual Deployment Script

For ad-hoc deployments, use the provided script:

```bash
chmod +x deploy-all.sh
./deploy-all.sh
```

This script:
- Cleans and builds the project
- Deploys sequentially to DEV, TEST, and PROD
- Shows deployment progress with emojis

---

## Monitoring

### Health Check Endpoint

Monitor service availability:

```bash
curl https://deviceconfirmation-dev-ab07-func.azurewebsites.net/api/health
```

### Application Insights

The service integrates with **Azure Application Insights** for:
- Request/response logging
- Performance metrics
- Error tracking
- Custom telemetry

Access metrics in Azure Portal → Application Insights → deviceconfirmation-*-appinsights

### Logging

All operations log to Azure Functions runtime:
- Confirmation actions created
- Event publishing success/failure
- Authentication failures
- Repository errors

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

## Project Structure

```
services/device-confirmation/
├── src/                       # Source code
│   ├── API/                   # HTTP functions
│   ├── Application/           # Use cases, handlers
│   ├── Domain/                # Entities, events
│   └── Infrastructure/        # DB, Auth, EventGrid
├── dist/                      # Compiled JavaScript (gitignored)
├── coverage/                  # Test coverage reports (gitignored)
├── node_modules/              # Dependencies (gitignored)
├── .github/
│   └── workflows/
│       └── device-confirmation-ci.yml
├── host.json                  # Azure Functions configuration
├── local.settings.json        # Local environment variables (gitignored)
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Jest test configuration
├── deploy-all.sh              # Deployment script
└── README.md                  # This file
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run clean` | Remove dist folder |
| `npm run watch` | Watch mode (rebuild on changes) |
| `npm test` | Run all tests |
| `npm start` | Start Azure Functions locally |
| `./deploy-all.sh` | Deploy to all environments |

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

---

## Contributing

1. Create a feature branch from `develop`
2. Write tests for new features
3. Ensure all tests pass: `npm test`
4. Build successfully: `npm run build`
5. Submit a pull request to `develop`

---

## License

Proprietary - Campus Device Lending System

---

## Support

For issues or questions:
- Create a GitHub issue
- Contact the development team

---

**Last Updated**: December 23, 2025  
**Version**: 1.0.0
