# CoreInventory

A full-stack warehouse and inventory management system built for the Odoo Hackathon. CoreInventory provides end-to-end stock tracking across multiple warehouses, covering inbound/outbound operations, internal transfers, physical count adjustments, and AI-powered demand forecasting.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Testing](#testing)

---

## Features

### Dashboard
- Real-time KPI cards: total products, low-stock count, out-of-stock count, and pending operations
- Bar chart overview of recent stock activity
- Filterable recent operations feed (receipts, deliveries, transfers, adjustments)
- Low-stock alerts with reorder suggestions

### AI-Powered Demand Forecasting
- Linear regression engine built on 90 days of delivery history
- Per-product area charts with trend direction indicators
- Stockout date predictions and automated reorder suggestions
- 30-day forward demand projections

### Product Management
- Full product catalogue with search and category filtering
- Create, edit, and delete products with SKU and unit-of-measure support
- CSV bulk product import via file upload
- Per-product total stock aggregated across all locations

### Category Management
- Create and manage product categories
- Assign categories to products for organised filtering

### Reorder Rules
- Set per-product reorder point (minimum threshold) and reorder quantity
- Rules are surfaced in dashboard alerts and forecasting suggestions

### Receipts (Inbound)
- Create multi-line receipt documents from suppliers
- Draft → Validate workflow: validating increases stock at the destination location
- Immutable stock move entries written on validation

### Deliveries (Outbound)
- Create multi-line delivery documents to customers
- Draft → Validate workflow: validating decreases stock at the source location
- Out-of-stock guard prevents over-delivery

### Internal Transfers
- Move stock between any two warehouse locations
- Transfers debit the source location and credit the destination atomically

### Stock Adjustments
- Physical inventory count corrections
- System quantity vs. counted quantity are recorded side-by-side
- Validation reconciles stock to the physically counted quantity

### Move History
- Unified, immutable stock move ledger with auto-generated reference numbers
- Filterable by move type (Receipt / Delivery / Transfer / Adjustment) and by product

### Warehouse & Location Management
- Create and manage multiple warehouses
- Add named sub-locations within each warehouse (e.g., Rack A, Shelf 1)

### User Profile
- View and update display name and email address
- Change password with current-password verification

### Authentication
- Secure JWT-based authentication (7-day tokens)
- Email/password signup and login
- Forgot password flow: 6-digit OTP sent via email, valid for 10 minutes
- Protected routes redirect unauthenticated users to login

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool and dev server |
| React Router v6 | Client-side routing |
| TanStack React Query v5 | Server state management and caching |
| Tailwind CSS | Utility-first styling |
| Radix UI + shadcn/ui | Accessible component primitives |
| Recharts | Dashboard and forecast charts |
| React Hook Form + Zod | Form state and validation |
| PapaParse | CSV parsing for bulk product import |
| lucide-react | Icon set |
| date-fns | Date formatting and manipulation |
| sonner | Toast notifications |

### Backend
| Technology | Purpose |
|---|---|
| Node.js (ES Modules) + Express v5 | API server |
| PostgreSQL via `pg` | Relational database |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT signing and verification |
| nodemailer | OTP password-reset emails |
| simple-statistics | Linear regression for the forecasting engine |
| dotenv | Environment variable loading |
| concurrently | Run frontend + backend with a single command |

### Testing
| Technology | Purpose |
|---|---|
| Vitest | Unit test runner |
| @testing-library/jest-dom | DOM assertion matchers |

---

## Project Structure

```
├── server/                  # Node.js/Express backend
│   ├── index.js             # Entry point, middleware setup
│   ├── db.js                # PostgreSQL connection pool
│   ├── schema.sql           # Database schema (DDL)
│   ├── migrate.js           # Schema migration runner
│   ├── seed.js              # Initial seed data
│   ├── seed-demand.js       # Historical demand data for forecasting
│   ├── middleware/
│   │   └── auth.js          # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js          # Signup, login, OTP password reset
│   │   ├── products.js      # Product CRUD + CSV bulk import
│   │   ├── receipts.js      # Inbound shipment documents
│   │   ├── deliveries.js    # Outbound shipment documents
│   │   ├── transfers.js     # Internal stock transfers
│   │   ├── adjustments.js   # Physical count adjustments
│   │   ├── moves.js         # Stock move ledger
│   │   ├── dashboard.js     # KPIs and recent operations
│   │   ├── warehouses.js    # Warehouse and location management
│   │   ├── forecasts.js     # AI demand forecasting engine
│   │   └── profile.js       # User profile management
│   └── utils/
│       └── email.js         # Nodemailer helper
├── src/                     # React frontend
│   ├── App.tsx              # Route definitions
│   ├── main.tsx             # React root
│   ├── components/
│   │   ├── AppLayout.tsx    # Sidebar navigation shell
│   │   ├── NavLink.tsx      # Active-aware nav link
│   │   └── ui/              # shadcn/ui component library
│   ├── contexts/
│   │   └── AuthContext.tsx  # Auth state, ProtectedRoute, PublicRoute
│   ├── hooks/               # Custom React hooks
│   ├── lib/
│   │   ├── api.ts           # Typed API client (fetch wrappers)
│   │   └── utils.ts         # Shared utility functions
│   └── pages/               # One file per route/page
├── docker-compose.yml       # PostgreSQL container
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or later
- **Docker** (for the PostgreSQL database container)
- An SMTP account for password-reset emails (e.g., Gmail with an App Password)

### Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:password@localhost:5433/coreinventory

# JWT signing secret — use a long random string
JWT_SECRET=your-long-random-secret

# API server port (optional, defaults to 3001)
PORT=3001

# SMTP settings for OTP password-reset emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@example.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM="CoreInventory" <you@example.com>
```

> **Gmail users:** Generate an [App Password](https://myaccount.google.com/apppasswords) and use it as `SMTP_PASS`. Two-factor authentication must be enabled on your Google account.

### Database Setup

1. Start the PostgreSQL container:
   ```bash
   docker-compose up -d
   ```

2. Run the schema migration to create all tables:
   ```bash
   npm run migrate
   ```

3. Seed the database with initial warehouses, locations, categories, products, and stock:
   ```bash
   npm run seed
   ```

4. (Optional) Seed historical demand data to enable forecasting:
   ```bash
   npm run seed:demand
   ```

### Running the App

Install dependencies once:
```bash
npm install
```

Start the frontend (Vite, port 5173) and backend (Express, port 3001) together:
```bash
npm run dev:all
```

Open `http://localhost:5173` in your browser. The API is available at `http://localhost:3001/api`.

---

## API Reference

All endpoints are prefixed with `/api/`. All routes except `/api/auth/*` require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register a new account |
| `POST` | `/auth/login` | Authenticate and receive a JWT |
| `GET` | `/auth/me` | Return the current user from token |
| `POST` | `/auth/forgot-password` | Send a 6-digit OTP to the user's email |
| `POST` | `/auth/reset-password` | Validate OTP and set a new password |
| `GET` | `/products` | List products (supports `?search=` and `?category=`) |
| `POST` | `/products` | Create a product |
| `PUT` | `/products/:id` | Update a product |
| `DELETE` | `/products/:id` | Delete a product |
| `POST` | `/products/bulk` | Bulk-create products from a CSV payload |
| `GET` | `/receipts` | List all receipt documents |
| `POST` | `/receipts` | Create a draft receipt |
| `PUT` | `/receipts/:id/validate` | Validate a receipt (increases stock) |
| `DELETE` | `/receipts/:id` | Delete a draft receipt |
| `GET` | `/deliveries` | List all delivery documents |
| `POST` | `/deliveries` | Create a draft delivery |
| `PUT` | `/deliveries/:id/validate` | Validate a delivery (decreases stock) |
| `DELETE` | `/deliveries/:id` | Delete a draft delivery |
| `GET` | `/transfers` | List all transfer documents |
| `POST` | `/transfers` | Create a draft transfer |
| `PUT` | `/transfers/:id/validate` | Validate a transfer (moves stock between locations) |
| `GET` | `/adjustments` | List all adjustment records |
| `POST` | `/adjustments` | Create an adjustment (auto-reads current system qty) |
| `PUT` | `/adjustments/:id/validate` | Validate an adjustment (reconciles stock) |
| `GET` | `/moves` | List stock moves (supports `?type=` and `?product_id=`) |
| `GET` | `/dashboard/kpis` | Return KPI totals |
| `GET` | `/dashboard/recent-operations` | Return recent operations feed |
| `GET` | `/dashboard/low-stock` | Return products at or below reorder point |
| `GET` | `/warehouses` | List warehouses |
| `POST` | `/warehouses` | Create a warehouse |
| `GET` | `/warehouses/all/locations` | List all locations across all warehouses |
| `GET` | `/warehouses/:id/locations` | List locations for a specific warehouse |
| `POST` | `/warehouses/:id/locations` | Add a location to a warehouse |
| `GET` | `/forecasts/suggestions` | AI-generated reorder suggestions for all products |
| `GET` | `/forecasts/:id/history` | Demand history + 30-day forecast for a product |
| `GET` | `/profile` | Get the current user's profile |
| `PUT` | `/profile` | Update name and email |
| `PUT` | `/profile/password` | Change password |

---

## Database Schema

| Table | Description |
|---|---|
| `users` | User accounts with hashed passwords and OTP reset fields |
| `warehouses` | Named warehouses with a unique code and optional address |
| `locations` | Sub-locations inside a warehouse (e.g., Rack A, Shelf 1) |
| `categories` | Product category labels |
| `products` | Products with SKU, UOM, reorder point, and reorder quantity |
| `stock` | Current quantity per (product, location) pair |
| `receipts` / `receipt_lines` | Inbound document header and line items |
| `deliveries` / `delivery_lines` | Outbound document header and line items |
| `transfers` / `transfer_lines` | Internal transfer header and line items |
| `adjustments` | Physical count record (system qty vs. counted qty) |
| `stock_moves` | Immutable ledger entry for every stock movement |
| `sequences` | Auto-incrementing reference counters (REC, DEL, TRF, ADJ, MOV) |

---

## Authentication

- Passwords are hashed with **bcryptjs** (salt rounds: 10) before storage.
- On login, a **JWT** is issued with a 7-day expiry, signed with `JWT_SECRET`.
- The frontend stores the token in `localStorage` and attaches it as a `Bearer` token on every API request.
- On app load, `GET /auth/me` validates the stored token and hydrates user state.
- **Password reset:** User requests an OTP → a 6-digit code is stored in the database with a 10-minute expiry and emailed to the user → user submits the OTP and a new password to `/auth/reset-password`.

---

## Testing

Run the test suite with:

```bash
npm test
```

