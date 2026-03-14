**Video Instructions**

This file collects all features of the Core Inventory project and provides a concise 4–5 minute demo video script you can read while recording.

**Project Overview:**
- **Purpose:** Inventory management web app with product, warehouse and movement tracking plus forecasting and reorder rules.
- **Stack:** Node.js + Express backend, SQLite/Postgres-compatible schema and seeding scripts, React + Vite frontend (TypeScript) with component library and pages.

**Key Features:**
- **Authentication:** Login, signup, forgot-password flows, protected routes and profile management.
- **Dashboard:** High-level KPIs and charts (inventory levels, movements, upcoming receipts/deliveries).
- **Products:** Create, edit, search, and view product details and stock levels.
- **Receipts:** Record incoming goods and update inventory quantities.
- **Deliveries / Moves / Transfers:** Create and track outbound shipments, internal moves, and inter-warehouse transfers.
- **Adjustments:** Make manual inventory adjustments with reasons and record history.
- **Forecasting:** Demand forecasts to support reorder planning.
- **Reorder Rules:** Define reorder points and recommended purchase quantities.
- **Warehouses:** Manage multiple physical locations and view per-warehouse stock.
- **Reports & History:** Move history, receipts, deliveries and adjustment logs.
- **Settings & Profile:** User settings, app configuration and email utilities.
- **Dev utilities:** DB migration (`migrate.js`), seed data (`seed.js`, `seed-demand.js`), and API endpoints under `server/routes`.

**Developer Notes (quick):**
- Run server: `node server/index.js` (or via `npm`/`pnpm` scripts if configured).
- DB files and schema: see `server/schema.sql`, migrations in `server/migrate.js`.
- Frontend: built with Vite; entry is `src/main.tsx`, pages in `src/pages`.

**4–5 Minute Demo Video Script**

00:00–00:15 — Intro (15s)
- "Hi, I’m [Name]. This is Core Inventory — a compact inventory management app for tracking products, warehouses, and movements. In the next four minutes I’ll show core flows: login, dashboard, product operations, receipts, transfers, forecasting, and settings."

00:15–00:45 — Quick Setup & Login (30s)
- Show the app URL and sign in screen.
- "I’ll log in as a demo user. Authentication protects inventory actions and personalizes the experience." (Complete login and land on the dashboard.)

00:45–01:30 — Dashboard Walkthrough (45s)
- Pan the dashboard: highlight KPIs, low-stock alerts, recent activity, and charts.
- "The dashboard surfaces critical inventory metrics — current stock value, low-stock alerts, and recent receipts and deliveries so you can spot issues quickly." Show clicking a low-stock alert to jump to product details.

01:30–02:30 — Products & Inventory (60s)
- Navigate to `Products` page and show list, search, and open a product.
- "Here is a product page: you can view current on-hand quantities per warehouse, recent movements, and edit product metadata." Demonstrate editing a field (e.g., reorder point) and saving.

02:30–03:30 — Receipts, Deliveries & Transfers (60s)
- Create a new `Receipt` (receive stock) and show inventory update.
- Create or view a `Delivery` and show how outbound reduces stock.
- Demonstrate a `Transfer` between warehouses and confirm quantities move locations.
- "These flows keep inventory accurate across sources and destinations."

03:30–04:10 — Forecasting & Reorder Rules (40s)
- Open `Forecasting` page and show a demand forecast or seed data visualization.
- Show `Reorder Rules` for a product and explain how the system recommends reorder quantities based on forecast and reorder point.

04:10–04:40 — Settings, Profile & Wrap-up (30s)
- Open user `Profile` and `Settings` briefly, mention email utilities and app configuration.
- "That wraps up the quick tour. For more, check the repo for API routes in `server/routes`, DB scripts under `server/`, and frontend pages under `src/pages`."

04:40–End — Call To Action (10–20s)
- "Thanks for watching — try the demo locally by running the server and frontend, or consult the README for setup details."

**Notes for Recording:**
- Keep each section focused and use short, clear sentences. Pause briefly after actions so viewers can see changes.
- If you need to extend any section, expand Products or Receipts walkthroughs — those are the most impactful.

---
Created for demo recording and quick onboarding. Place this file at project root for reference.
