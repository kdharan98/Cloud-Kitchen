# Cloud Kitchen

Initial development scaffold for the Cloud Kitchen food delivery platform.
Customer and admin frontends are separate applications that use one FastAPI
backend and one PostgreSQL database. This scaffold intentionally contains no
business features.

## Requirements

- Node.js and npm
- Python 3.11
- PostgreSQL running locally with the `cloud_kitchen` database and
  `cloud_kitchen_user` application role

## Backend

The first time, open PowerShell and run:

```powershell
Set-Location "C:\Cloud Kitchen\backend"
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Configure `backend\.env` with the connection details for your local PostgreSQL
database. The database and `cloud_kitchen_user` role must exist before starting
the API. Do not commit `.env` or put real credentials in source files.

With the virtual environment activated, apply the database migrations and start
the API:

```powershell
alembic upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On later starts, open a new PowerShell terminal and run:

```powershell
Set-Location "C:\Cloud Kitchen\backend"
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The migration command is needed for the initial database setup and again when
new migrations are added. The health endpoint is available at
<http://127.0.0.1:8000/health>, and the interactive API docs are at
<http://127.0.0.1:8000/docs>.

## Frontends

There is no `package.json` directly in `frontend`. The customer app and admin
dashboard each have their own `package.json`, dependencies, and dev server.
For the first run, open a separate PowerShell terminal for each app, install
its dependencies, and start it:

```powershell
Set-Location "C:\Cloud Kitchen\frontend\customer-app"
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

```powershell
Set-Location "C:\Cloud Kitchen\frontend\admin-dashboard"
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

On later starts, use one terminal per app and run `npm run dev` from that
app's directory; `npm install` does not need to be repeated unless dependencies
change or `node_modules` is removed. The customer app uses port 5173 and the
admin dashboard uses port 5174. Both default to the API at
`http://127.0.0.1:8000`; set `VITE_API_BASE_URL` in the app's local `.env` if
needed. Start the backend in its own terminal when an app needs the API.

See [docs/architecture.md](docs/architecture.md) for the initial architecture.
