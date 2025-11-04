# Olympic Data Analytics 

Updated: 2025-11-04

This repository hosts a clean, reproducible setup for a full-stack data project:
- Backend API: Node.js/Express + MySQL
- Frontend: React (CRA)
- Data/Science: Python scripts + SQL + Notebooks

The project is organized as two isolated JS apps (each with its own package.json and node_modules) and shared datasets at the repo root (csv/, data/, sql/) plus Python utilities under `src/`.

Quick start (Windows PowerShell):

```powershell
# 1) Install
cd src\api ; npm ci ; cd ..\webapp ; npm ci ; cd ..\..

# 2) Configure envs
#   - src\api\.env (DB & PORT)
#   - src\webapp\.env (REACT_APP_API_URL & PORT)

# 3) Run
cd src\api ; npm start
# new terminal
cd src\webapp ; npm start

# Webapp: http://localhost:3000
# API:    http://localhost:3001/api
```

## Final project tree

```
Olympique_JO/
  csv/                      # normalized CSV outputs used by API/SQL
    olympic_athletes.csv
    olympic_hosts.csv
    olympic_medals.csv
    olympic_results.csv
  data/                     # raw sources (json, xlsx, xml, html)
    olympic_athletes.json
    olympic_hosts.xml
    olympic_medals.xlsx
    olympic_results.html
  notebooks/
    exploration.ipynb
    import.ipynb
  sql/
    olympics.sql
    insert_data.sql
    insert_data_python.sql
    validate_database.sql
    README.md
  src/
    convert_all_to_csv.py   # batch converter (json/xlsx/xml/html → csv)
    convert_html_to_csv.py
    convert_json_to_csv.py
    convert_xlsx_to_csv.py
    convert_xml_to_csv.py
    load_data_to_mysql.py   # optional loader
    simple_conversions.py
    api/
      app.js
      database.js
      .env                  # API-only secrets
      package.json
      node_modules/
    webapp/
      public/
        index.html
      src/
        App.js
        index.js
        index.css
      .env                  # Frontend-only env (REACT_APP_*)
      package.json
      node_modules/
  README.md
  .gitignore
  requirements.txt          # Python dependencies
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

Run the following from the repo root.

Windows (PowerShell):

```powershell
# Backend API
cd src\api
npm ci

# Frontend React
cd ..\webapp
# If you ran the previous block in a separate terminal, run from repo root instead:
# cd src\webapp
npm ci

# (Optional) Python env
cd ..\..  # back to repo root
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

macOS/Linux (bash/zsh):

```bash
# Backend API
cd ../src/api
node app.js

#FrontEnd
cd src/webapp
npm run start

# (Optional) Python env
cd ../..  # back to repo root
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
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

If ports 3000/3001 are busy, adjust `PORT` in each `.env` and restart.

## 4) API reference (quick)

Base URL: `http://localhost:3001/api`

- GET `/filters`
  - Returns available filter options (countries, sports, events, genders, year range, etc.).
- GET `/stats/quick`
  - Small summary KPIs (e.g., total medals/athletes/hosts) for dashboard header.
- POST `/data/filtered`
  - Body: JSON filters object. Returns `{ results, stats, aggregations }` for charts/table.

Request example (POST /data/filtered):

```json
{
  "countries": ["FRA", "USA"],
  "sports": ["Athletics", "Swimming"],
  "genders": ["Men", "Women"],
  "years": { "min": 1980, "max": 2024 },
  "medalTypes": ["Gold", "Silver", "Bronze"],
  "search": "Phelps"
}
```

Response shape (abridged):

```json
{
  "results": [ { "athlete": "...", "country": "USA", "year": 2008, "sport": "Swimming", "medal": "Gold" } ],
  "stats": { "totalMedals": 1234, "totalAthletes": 567, "countries": 45 },
  "aggregations": {
    "medalsByCountry": [ { "country": "USA", "count": 100 }, { "country": "FRA", "count": 80 } ],
    "medalsOverTime": [ { "year": 2000, "count": 50 } ]
  }
}
```

Notes:
- Authentication is not required in dev.
- Ensure your MySQL connection (in `src/api/.env`) points to a database loaded with the provided SQL.

## 5) Frontend dashboard

The React app provides a responsive dashboard with:
- Dynamic filters (country, sport, gender, year range, medal type, search) with multi-select
- Quick stats header and multiple charts (Recharts)
- Results table with pagination
- Smooth animations (framer-motion) and debounced filter updates
- Data fetching via React Query v3

Environment:
- React 18 + react-scripts 5
- Dependencies: `react-query@^3`, `recharts`, `react-select`, `rc-slider`, `axios`, `framer-motion`

## 6) Data import (examples)

```powershell
# Python virtualenv assumed active
# Convert and normalize raw data
python src\convert_all_to_csv.py

# or run specific converters
python src\convert_json_to_csv.py
python src\convert_xlsx_to_csv.py
python src\convert_xml_to_csv.py
python src\convert_html_to_csv.py

# Load schema / seed (run in MySQL client or via scripts)
# sql\olympics.sql
# sql\insert_data.sql
# sql\validate_database.sql
```

## 7) Common tasks

```powershell
# Install deps (locked)
cd src\api ; npm ci ; cd ..\webapp ; npm ci

# Lint/format (if configured)
cd src\api ; npm run lint ; cd ..\webapp ; npm run lint

# Production builds
cd src\webapp ; npm run build
```

## 8) Cleanup rules (enforced by .gitignore)
- Ignore: node_modules, build/, dist/, coverage/, .cache/, logs, .env, __pycache__, .ipynb_checkpoints
- No package.json or node_modules at the repo root
- No duplicated build outputs committed

## 9) Troubleshooting
- Delete stray node_modules or package-lock.json outside `src/api` or `src/webapp`
- Always run npm commands inside the correct sub-folder
- If React/Express start on wrong ports, check the .env files
 - If `/api/filters` or `/api/stats/quick` return 404, ensure `src/api/app.js` is the updated version and server restarted

## 10) Validation checklist
- [ ] Exactly 2 package.json files (src/api, src/webapp)
- [ ] Exactly 2 node_modules folders (src/api, src/webapp)
- [ ] No build/ or dist/ committed under version control
- [ ] Both servers start: http://localhost:3000 and http://localhost:3001/api
- [ ] Data scripts run and MySQL schema loads
 - [ ] API routes live: GET /api/filters, GET /api/stats/quick, POST /api/data/filtered

---

For Docker, CI/CD, multi-env or DB migrations, see the extended guide to be added later.
