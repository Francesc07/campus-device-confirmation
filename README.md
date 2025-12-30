# Campus Device Confirmation System

> A serverless microservice for managing device collection and return confirmations in the Campus Device Lending system.

## 🎯 Overview

The Campus Device Confirmation System is a cloud-native Azure Functions application that handles staff-side operations for confirming device collections and returns. It provides a secure, scalable solution for tracking loan confirmations with complete audit trails and event-driven integrations.

### Key Capabilities

- ✅ **Staff Confirmation Workflows** - Confirm device collections and returns
- 📝 **Audit Trail** - Complete history of all confirmation actions
- 🔄 **Event-Driven Architecture** - Publishes events to Azure Event Grid
- 🔒 **Secure Authentication** - Auth0 JWT with role-based access control
- 📊 **State Management** - Point-in-time reservation snapshots
- 🌐 **Globally Distributed** - Azure Cosmos DB with multi-region support

---

## 🏗️ Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Azure Functions (Node.js 22) | Serverless compute platform |
| **Language** | TypeScript | Type-safe development |
| **Database** | Azure Cosmos DB (NoSQL) | Globally distributed, low-latency data storage |
| **Messaging** | Azure Event Grid | Event-driven service integration |
| **Authentication** | Auth0 | JWT-based authentication with RBAC |
| **Testing** | Jest | Unit and integration testing |
| **CI/CD** | GitHub Actions | Automated deployment pipeline |

### Clean Architecture Design

The codebase follows **Clean Architecture** principles with clear separation of concerns:

```
src/
├── API/                    # Presentation Layer - HTTP endpoints
├── Application/            # Application Layer - Use cases, DTOs
├── Domain/                 # Domain Layer - Business entities, events
└── Infrastructure/         # Infrastructure Layer - External services
```

**Benefits:**
- **Testability**: All dependencies are mockable
- **Maintainability**: Clear separation of business logic
- **Flexibility**: Easy to swap infrastructure implementations
- **Domain-Driven**: Business logic lives in the domain layer

---

## 📦 Project Structure

```
campus-device-confirmation/
├── .github/
│   └── workflows/
│       └── device-confirmation-ci.yml    # CI/CD pipeline
├── .devcontainer/                         # Development container config
├── services/
│   └── device-confirmation/               # Main service
│       ├── src/                           # TypeScript source code
│       │   ├── API/                       # HTTP functions
│       │   ├── Application/               # Use cases & handlers
│       │   ├── Domain/                    # Business entities
│       │   └── Infrastructure/            # External integrations
│       ├── coverage/                      # Test coverage reports
│       ├── dist/                          # Compiled JavaScript
│       ├── host.json                      # Azure Functions config
│       ├── local.settings.json            # Local environment vars (not in git)
│       ├── package.json                   # Dependencies & scripts
│       ├── tsconfig.json                  # TypeScript config
│       ├── jest.config.js                 # Jest test config
│       ├── deploy-all.sh                  # Deployment script
│       └── README.md                      # Service documentation
└── README.md                              # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22.x or later
- **Azure Functions Core Tools** v4
- **Azure Cosmos DB** (Emulator or cloud instance)
- **Auth0 account** (for authentication)
- **Azure CLI** (for deployment)

### Local Development

1. **Navigate to the service directory**
   ```bash
   cd services/device-confirmation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create `local.settings.json` with your Azure resources:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "COSMOS_DB_CONNECTION_STRING": "YOUR_COSMOS_CONNECTION_STRING",
       "COSMOS_DB_DATABASE_NAME": "DeviceConfirmationDB",
       "COSMOS_DB_CONTAINER_NAME": "Confirmations",
       "EVENTGRID_TOPIC_ENDPOINT": "YOUR_EVENTGRID_ENDPOINT",
       "EVENTGRID_TOPIC_KEY": "YOUR_EVENTGRID_KEY",
       "AUTH0_DOMAIN": "YOUR_AUTH0_DOMAIN",
       "AUTH0_AUDIENCE": "YOUR_AUTH0_AUDIENCE"
     }
   }
   ```
   
   > ⚠️ **Security Note**: `local.settings.json` is git-ignored and should NEVER be committed. All secrets are managed in Azure Application Settings.

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run locally**
   ```bash
   npm start
   ```

6. **Test the health endpoint**
   ```bash
   curl http://localhost:7071/api/health
   ```

---

## 🧪 Testing

### Run Tests

```bash
# Run all unit tests
npm test

# Run with coverage report
npm test -- --coverage

# Run specific test suite
npm test -- ConfirmCollectionUseCase.test.ts

# Watch mode for development
npm test -- --watch
```

### Test Coverage

- **Total Tests**: 86+ unit tests
- **Coverage**: ~75% (use cases and domain logic)
- **Test Suites**: Domain entities, use cases, infrastructure

---

## 📚 API Documentation

For detailed API documentation, see [services/device-confirmation/README.md](services/device-confirmation/README.md).

### Core Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/api/health` | None | Health check (anonymous) |
| `POST` | `/api/confirmation/collection/confirm` | `confirm:collection` | Confirm device collection |
| `POST` | `/api/confirmation/return/confirm` | `confirm:return` | Confirm device return |
| `GET` | `/api/staff/pending-loans` | `read:loans` | List pending loans |
| `GET` | `/api/confirmation/actions` | `read:actions` | List confirmation history |

### Authentication

All protected endpoints require an Auth0 JWT token:

```http
Authorization: Bearer <your-jwt-token>
```

---

## 🌐 Deployment

### Environments

| Environment | URL | Auto-Deploy | Approval |
|-------------|-----|-------------|----------|
| **DEV** | https://deviceconfirmation-dev-ab07-func.azurewebsites.net | ✅ Yes | ❌ No |
| **TEST** | https://deviceconfirmation-test-ab07-func.azurewebsites.net | ✅ Yes | ❌ No |
| **PROD** | https://deviceconfirmation-prod-ab07-func.azurewebsites.net | ❌ Manual | ✅ Yes |

### Automated Deployment (GitHub Actions)

The CI/CD pipeline automatically:
1. Runs all tests on every push
2. Deploys to **DEV** and **TEST** on `develop` branch
3. Requires manual approval for **PROD** deployment

### Manual Deployment

```bash
cd services/device-confirmation
chmod +x deploy-all.sh
./deploy-all.sh
```

This script deploys sequentially to DEV → TEST → PROD.

---

## 🔐 Security & Configuration

### Environment Variables

All sensitive configuration is stored in **Azure Application Settings**, not in code:

- ✅ Cosmos DB connection strings
- ✅ Event Grid access keys
- ✅ Auth0 credentials
- ✅ SendGrid API keys

### Local Development

For local development, use `local.settings.json` (git-ignored):
- Contains placeholder values in the repository
- Developers must populate with their own credentials
- Never commit actual secrets

### Best Practices

- 🔒 All secrets are in Azure Key Vault or Application Settings
- 🚫 No hardcoded credentials in source code
- ✅ Environment-specific configuration via environment variables
- ✅ Auth0 JWT validation on all protected endpoints

---

## 📊 Data Model

### Cosmos DB Containers

#### 1. Confirmations Container
Stores all confirmation actions with audit trail.

**Partition Key**: `reservationId`

**Document Example**:
```json
{
  "id": "action-uuid",
  "staffId": "staff-001",
  "reservationId": "res-12345",
  "deviceId": "dev-67890",
  "actionType": "Collection",
  "timestamp": "2025-12-30T10:30:00Z",
  "notes": "Device in good condition"
}
```

#### 2. ReservationSnapshots Container
Point-in-time snapshots of reservation state.

**Partition Key**: `reservationId`

**Document Example**:
```json
{
  "id": "snapshot-uuid",
  "reservationId": "res-12345",
  "status": "Collected",
  "studentId": "student-001",
  "deviceId": "dev-67890",
  "startDate": "2025-12-30T09:00:00Z",
  "dueDate": "2026-01-06T09:00:00Z",
  "createdAt": "2025-12-30T09:00:00Z",
  "updatedAt": "2025-12-30T10:30:00Z"
}
```

---

## 🔧 Development Tools

### VS Code Extensions (Recommended)

- **Azure Functions** - For local development and debugging
- **Azure Cosmos DB** - Explore and query Cosmos DB
- **Azure Account** - Azure authentication
- **Prettier** - Code formatting
- **ESLint** - Code linting

### Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Compile TypeScript |
| `npm run clean` | Remove compiled files |
| `npm run watch` | Watch mode (auto-rebuild) |
| `npm test` | Run all tests |
| `npm start` | Start Azure Functions locally |

---

## 📈 Monitoring

### Application Insights

All environments are monitored via **Azure Application Insights**:
- Request/response telemetry
- Performance metrics
- Error tracking
- Custom logging

### Health Check

Monitor service availability:

```bash
# DEV
curl https://deviceconfirmation-dev-ab07-func.azurewebsites.net/api/health

# TEST
curl https://deviceconfirmation-test-ab07-func.azurewebsites.net/api/health

# PROD
curl https://deviceconfirmation-prod-ab07-func.azurewebsites.net/api/health
```

---

## 🤝 Contributing

### Workflow

1. Create a feature branch from `develop`
2. Write code following TypeScript best practices
3. Add unit tests for new features
4. Ensure all tests pass: `npm test`
5. Build successfully: `npm run build`
6. Submit pull request to `develop`

### Code Standards

- ✅ TypeScript strict mode enabled
- ✅ Clean Architecture principles
- ✅ Comprehensive unit test coverage
- ✅ Meaningful commit messages
- ✅ No secrets in source code

---

## 📝 License

Proprietary - Campus Device Lending System

---

## 📞 Support

For questions or issues:
- 📧 Contact the development team
- 🐛 Create a GitHub issue
- 📖 Review the [service documentation](services/device-confirmation/README.md)

---

**Last Updated**: December 30, 2025  
**Version**: 1.0.0
