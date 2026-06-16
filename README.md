# Trading Signal Tracker

A production-quality, full-stack trading signal tracking application that integrates with the Binance REST API for live cryptocurrency price data, automated signal status resolution, and a real-time dashboard. Built as a single-user internal tool for tracking BUY/SELL signals with stop-loss, target, and expiry logic.

---

## Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Database Setup Details](#database-setup-details)
3. [API Documentation](#api-documentation)
4. [Architecture](#architecture)

---

## Setup Instructions

### Prerequisites

- **Node.js** ≥ 18
- **Docker** & **Docker Compose** (for PostgreSQL)
- **npm** (comes with Node.js)

### Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd trading-signal-tracker

# 2. Start PostgreSQL via Docker
docker compose up -d

# 3. Set up the backend
cd backend
cp .env.example .env        # uses default credentials matching docker-compose
npm install
npx prisma migrate dev --name init   # creates tables
npx prisma generate                   # generates Prisma client
npm run dev                            # starts backend on http://localhost:3001

# 4. In a new terminal — set up the frontend
cd frontend
cp .env.example .env
npm install
npm run dev                            # starts frontend on http://localhost:5173
```

### Default Ports

| Service    | Port |
|------------|------|
| PostgreSQL | 5432 |
| Backend    | 3001 |
| Frontend   | 5173 |

### Environment Variables

**Backend (`backend/.env`)**:
| Variable            | Default                                                                 | Description                          |
|---------------------|-------------------------------------------------------------------------|--------------------------------------|
| `DATABASE_URL`      | `postgresql://trader:trader_pass@localhost:5432/trading_signals?schema=public` | PostgreSQL connection string         |
| `PORT`              | `3001`                                                                  | Express server port                  |
| `POLL_INTERVAL_MS`  | `10000`                                                                 | Scheduler interval (ms)             |
| `BINANCE_CACHE_TTL_MS` | `5000`                                                               | Binance price cache TTL (ms)        |

**Frontend (`frontend/.env`)**:
| Variable             | Default                    | Description                          |
|----------------------|----------------------------|--------------------------------------|
| `VITE_API_BASE_URL`  | `http://localhost:3001`    | Backend API base URL (unused in dev due to Vite proxy) |

### Running Tests

```bash
cd backend
npm test    # runs Jest unit tests for ROI calculations and validation logic
```

---

## Database Setup Details

### Schema Overview

The application uses a single `Signal` model managed by Prisma ORM. The schema maps directly to a PostgreSQL table:

| Column          | Type                | Description                                              |
|-----------------|---------------------|----------------------------------------------------------|
| `id`            | UUID (PK)           | Auto-generated unique identifier                         |
| `symbol`        | String              | Trading pair (e.g., BTCUSDT) — stored uppercase          |
| `direction`     | Enum (BUY/SELL)     | Signal direction                                         |
| `entryPrice`    | Decimal(18,8)       | Price at signal entry                                    |
| `stopLoss`      | Decimal(18,8)       | Stop-loss price threshold                                |
| `targetPrice`   | Decimal(18,8)       | Target price threshold                                   |
| `entryTime`     | DateTime            | When the signal was entered                              |
| `expiryTime`    | DateTime            | When the signal expires                                  |
| `createdAt`     | DateTime            | Auto-set on creation                                     |
| `status`        | Enum                | OPEN, TARGET_HIT, STOPLOSS_HIT, or EXPIRED              |
| `realizedRoi`   | Decimal(10,2)?      | Set only upon resolution (null while OPEN)               |
| `lastKnownPrice`| Decimal(18,8)?      | Cached price — exit price on resolution, live while OPEN |

**Indexes**: `status` and `symbol` columns are indexed for query performance.

### Inspecting Data

```bash
cd backend
npx prisma studio    # opens a web UI at http://localhost:5555 to browse/edit data
```

---

## API Documentation

### Base URL: `http://localhost:3001/api`

All responses are JSON. All error responses follow: `{ "error": "<message>" }`.

---

### POST `/api/signals` — Create a Signal

**Status**: `201 Created`

**Request Body**:
```json
{
  "symbol": "BTCUSDT",
  "direction": "BUY",
  "entryPrice": 67000,
  "stopLoss": 65000,
  "targetPrice": 70000,
  "entryTime": "2024-12-15T10:00:00Z",
  "expiryTime": "2024-12-16T10:00:00Z"
}
```

**Success Response** (`201`):
```json
{
  "id": "a1b2c3d4-...",
  "symbol": "BTCUSDT",
  "direction": "BUY",
  "entryPrice": "67000",
  "stopLoss": "65000",
  "targetPrice": "70000",
  "entryTime": "2024-12-15T10:00:00.000Z",
  "expiryTime": "2024-12-16T10:00:00.000Z",
  "createdAt": "2024-12-15T10:05:00.000Z",
  "status": "OPEN",
  "realizedRoi": null,
  "lastKnownPrice": null
}
```

**Validation Error** (`400`):
```json
{
  "error": "For BUY signals, stopLoss must be less than entryPrice",
  "field": "stopLoss"
}
```

---

### GET `/api/signals` — List All Signals

**Status**: `200 OK`

**Query Parameters**: `?status=OPEN` (optional filter)

**Response**: Array of signal objects, each augmented with:
- `currentPrice` — live price (OPEN) or last known price (resolved)
- `unrealizedRoi` — computed on-the-fly for OPEN signals (null for resolved)
- `timeRemainingSeconds` — seconds until expiry (0 if expired)

```json
[
  {
    "id": "a1b2c3d4-...",
    "symbol": "BTCUSDT",
    "direction": "BUY",
    "entryPrice": 67000,
    "stopLoss": 65000,
    "targetPrice": 70000,
    "entryTime": "2024-12-15T10:00:00.000Z",
    "expiryTime": "2024-12-16T10:00:00.000Z",
    "createdAt": "2024-12-15T10:05:00.000Z",
    "status": "OPEN",
    "realizedRoi": null,
    "lastKnownPrice": 67250.5,
    "currentPrice": 67250.5,
    "unrealizedRoi": 0.37,
    "timeRemainingSeconds": 43200
  }
]
```

---

### GET `/api/signals/:id` — Get a Single Signal

**Status**: `200 OK` | `404 Not Found`

**Response**: Same augmented signal object as above.

**Error** (`404`):
```json
{ "error": "Signal not found" }
```

---

### DELETE `/api/signals/:id` — Delete a Signal

**Status**: `200 OK` | `404 Not Found`

**Success Response**:
```json
{ "message": "Signal deleted" }
```

---

### GET `/api/signals/:id/status` — Lightweight Status Check

**Status**: `200 OK` | `404 Not Found`

**Response**:
```json
{
  "id": "a1b2c3d4-...",
  "status": "OPEN",
  "currentPrice": 67250.5,
  "unrealizedRoi": 0.37,
  "realizedRoi": null,
  "timeRemainingSeconds": 43200
}
```

---

## Architecture

### Request Flow

```
Frontend (React/Vite)
  → axios HTTP requests
    → Express API routes (signal.routes.js)
      → Validation middleware (express-validator)
        → Controller (signal.controller.js) — parses req/res only
          → Service layer (signal.service.js) — all business logic
            → Prisma ORM
              → PostgreSQL
```

**Separation of concerns**: Controllers contain zero business logic — they parse HTTP requests and delegate to services. Services own all CRUD operations, status resolution, and ROI computation. Pure utility functions (ROI calculations) live in `utils/` for easy unit testing.

### Live Price Polling & Status Resolution

The price-polling and status-resolution system operates as a **decoupled background loop**, independent of the HTTP request cycle:

1. **Scheduler** (`scheduler.service.js`): Runs every 10 seconds via `setInterval`. It is started once when the Express server boots and runs continuously.

2. **Binance Service** (`binance.service.js`): Fetches the full price list from Binance's REST API (`/api/v3/ticker/price` with no symbol parameter), returning all trading pairs in one request. Prices are cached in-memory with a ~5-second TTL. This means the scheduler's 10-second tick and the dashboard's 15-second frontend polling share the same cache, avoiding redundant Binance API calls.

3. **Signal Evaluation** (`signal.service.js → evaluateOpenSignals`):
   - Queries **only** `status = OPEN` signals (structural enforcement)
   - Groups by distinct symbol to minimize price lookups
   - Evaluates each signal with **strict precedence**: price triggers (stop-loss/target) are checked **before** expiry, because a price hit that's "discovered late" still takes logical priority
   - On resolution: atomically updates `status`, `realizedRoi`, and `lastKnownPrice` in a single Prisma `update` call
   - On no trigger: updates `lastKnownPrice` so the dashboard always has fresh data

### Why "Never Re-Evaluate Resolved Signals" is Structural

The query in step 1 (`WHERE status = 'OPEN'`) means resolved signals (`TARGET_HIT`, `STOPLOSS_HIT`, `EXPIRED`) are **never fetched** for evaluation. This is not an `if` check that could be bypassed — it's a database-level filter. A resolved signal's status and ROI are immutable once set.

### Tradeoffs

- **REST polling vs. WebSockets**: REST polling is simpler to implement, test, and demo. The 10-second scheduler interval is sufficient for a signal tracker (not a high-frequency trading engine). WebSockets would reduce latency but add complexity.
- **In-memory price cache**: Simple and effective for a single-server deployment. For multi-instance deployments, Redis would be needed — but that's out of scope for this single-user tool.
- **setInterval over node-cron**: `setInterval` is simpler and sufficient for a fixed-interval task. `node-cron` would be needed for more complex scheduling patterns (e.g., "every weekday at market open").
- **Optimistic UI deletes**: The frontend removes the row immediately on delete without waiting for the next 15-second poll, making the UI feel responsive.
- **`lastKnownPrice` dual-purpose field**: Serves as both a resolution snapshot (the exit price when a signal resolves) and an opportunistic cache (updated every tick while OPEN). This ensures the dashboard always has a price to display, even if Binance is momentarily unreachable.
