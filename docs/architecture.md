# Initial architecture

## Components

- `frontend/customer-app`: standalone React, TypeScript, Vite, Tailwind CSS,
  and Lucide React application for customer-facing development.
- `frontend/admin-dashboard`: standalone React, TypeScript, Vite, Tailwind CSS,
  and Lucide React application for admin-facing development.
- `backend`: FastAPI application using SQLAlchemy 2, Psycopg 3, Pydantic
  Settings, and Alembic.
- PostgreSQL: one local `cloud_kitchen` database, accessed by the shared
  backend using the `cloud_kitchen_user` role.

Both frontends are configured to target the same FastAPI API URL; HTTP requests
have not yet been implemented. Neither frontend connects directly to
PostgreSQL, and no separate admin database is created.

## Local development

The API listens on `127.0.0.1:8000`. The customer frontend listens on
`127.0.0.1:5173` and the admin frontend on `127.0.0.1:5174`. The backend CORS
allowlist includes localhost and loopback origins for both frontend ports.

Database credentials are read from `backend/.env` via Pydantic Settings. The
checked-in `.env.example` files contain placeholders only. Alembic reads the
same database URL as the application; database schema changes will be managed
through migrations.

The initial Alembic migration must explicitly ensure PostgreSQL's `btree_gist`
extension is available before creating the price-period and pause-overlap
exclusion constraints. This is a database extension dependency, not a Python
package; do not assume it is preinstalled.

`GET /health` is a basic API liveness check. It does not currently verify
database connectivity. No food ordering, account, menu, or administrative
business features are implemented in this scaffold.
