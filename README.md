# Olympic Data Analytics — Clean Monorepo

This repository hosts a clean, reproducible setup for a full-stack data project:
- Backend API: Node.js/Express + MySQL
- Frontend: React (CRA)
- Data/Science: Python scripts + SQL + Notebooks

The project is organized as two isolated JS apps (each with its own package.json and node_modules) and shared data/scripts at the repo root.

## Final project tree

```
Olympique_JO/
  notebooks/
    exploration.ipynb
    import.ipynb
  sql/
    olympics.sql
    insert_data.sql
    insert_data_python.sql
    validate_database.sql
    README.md
  data/
    (csv, xlsx, xml, json, html files, etc.)
  src/
    api/
      app.js
      database.js
      .env               # API-only secrets
      package.json
      node_modules/
    webapp/
      public/
        index.html
      src/
        App.js
        index.js
        index.css
      .env               # Frontend-only env (REACT_APP_*)
      package.json
      node_modules/
  README.md
  .gitignore
  requirements.txt        # python dependencies
  scripts/                # optional: Python utilities
    convert_all_to_csv.py
```

Notes:
- No node_modules at the repo root. Each sub-project owns its dependencies.
- No build artifacts committed (build/, dist/, coverage/, .cache/ are ignored).
- Only one package.json per sub-project (src/api, src/webapp).

## Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- MySQL 8+ (or compatible server)

## 1) Installation

Run the following from the repo root in Windows PowerShell:

```powershell
# Backend API
cd src\api
npm ci

# Frontend React
cd ..\webapp
npm ci

# (Optional) Python env
cd ..\..  # back to repo root
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2) Configure environment

Create .env files only inside each sub-project:

`src/api/.env`
```
PORT=3001
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-user
DB_PASSWORD=your-password
DB_DATABASE=olympics
```

`src/webapp/.env`
```
REACT_APP_API_URL=http://localhost:3001/api
PORT=3000
```

## 3) Launch

```powershell
# Terminal 1 — Backend
cd src\api
npm start

# Terminal 2 — Frontend
cd src\webapp
npm start

# Open: http://localhost:3000
# API:  http://localhost:3001/api
```

## 4) Data import (examples)

```powershell
# Python virtualenv assumed active
# Convert and normalize raw data
python scripts\convert_all_to_csv.py

# Load schema / seed (run in MySQL client or via scripts)
# sql\olympics.sql
# sql\insert_data.sql
# sql\validate_database.sql
```

## 5) Common tasks

```powershell
# Install deps (locked)
cd src\api ; npm ci ; cd ..\webapp ; npm ci

# Lint/format (if configured)
cd src\api ; npm run lint ; cd ..\webapp ; npm run lint

# Production builds
cd src\webapp ; npm run build
```

## 6) Cleanup rules (enforced by .gitignore)
- Ignore: node_modules, build/, dist/, coverage/, .cache/, logs, .env, __pycache__, .ipynb_checkpoints
- No package.json or node_modules at the repo root
- No duplicated build outputs committed

## 7) Troubleshooting
- Delete stray node_modules or package-lock.json outside `src/api` or `src/webapp`
- Always run npm commands inside the correct sub-folder
- If React/Express start on wrong ports, check the .env files

## 8) Validation checklist
- [ ] Exactly 2 package.json files (src/api, src/webapp)
- [ ] Exactly 2 node_modules folders (src/api, src/webapp)
- [ ] No build/ or dist/ committed under version control
- [ ] Both servers start: http://localhost:3000 and http://localhost:3001/api
- [ ] Data scripts run and MySQL schema loads

---

For Docker, CI/CD, multi-env or DB migrations, see the extended guide to be added later.
