# HostelHub

A campus marketplace where students buy, sell and message each other inside their own college community.
React (Vite) + Flask + SQLite (PostgreSQL in production).

## Features

**Marketplace** — search, category/condition filters, price sorting, "Load more" pagination, loading skeletons, empty/error states.
**Listings** — photo upload (validated by file signature, 5MB max), create/edit/delete, mark as sold / relist, price hint from similar listings.
**Messaging** — contact a seller from a listing, inbox with unread badge, per-listing conversations (polls every 5s; no WebSockets needed).
**Saved items** — wishlist with instant save/unsave.
**Accounts** — register/login (JWT), profile editing, optional college-email-only registration.
**Safety** — report a listing, admin moderation page (dismiss report / remove listing), rate limiting on login, register, upload, messages and reports.
**Engineering** — pytest suite, GitHub Actions CI, Dockerfiles + docker-compose (with PostgreSQL), env-based config.

## Project structure

```
hostelhub/
├── backend/
│   ├── run.py  config.py  requirements.txt  requirements-dev.txt  pytest.ini  Dockerfile
│   ├── app/
│   │   ├── __init__.py  extensions.py  models.py
│   │   └── routes/  auth.py  products.py  wishlist.py  uploads.py  messages.py  moderation.py
│   └── tests/  conftest.py  test_auth.py  test_products.py  test_messages_and_moderation.py
├── frontend/
│   ├── Dockerfile  nginx.conf  vercel.json  package.json
│   └── src/
│       ├── components/  context/  hooks/  pages/  services/  styles/
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Run locally (development)

Backend:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # optional
python run.py               # http://localhost:5000
```

Frontend (second terminal):
```bash
cd frontend
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

### Keeping your existing data
If you already have a `backend/hostelhub.db`, copy it into the new `backend/` folder. No migration is needed:
new tables (messages, reports) are created automatically and no existing columns changed.
Old image URLs keep working.

## Run the tests
```bash
cd backend
source venv/bin/activate
pytest -q
```

## Configuration (backend environment variables)

| Variable | Purpose |
|---|---|
| `APP_ENV` | Set to `production` to refuse to start with the default dev secrets |
| `SECRET_KEY`, `JWT_SECRET_KEY` | Long random strings (required in production) |
| `DATABASE_URL` | PostgreSQL URL. If unset, a local SQLite file is used |
| `CORS_ORIGINS` | Allowed frontend origins, comma separated |
| `ALLOWED_EMAIL_DOMAINS` | e.g. `mycollege.edu.in` — only these emails can register. Empty = anyone |
| `ADMIN_EMAILS` | Accounts that can open `/admin` |
| `UPLOAD_FOLDER` | Where uploaded images are stored |

Frontend: `VITE_API_URL` (backend address).

To try the admin page locally: set `ADMIN_EMAILS=you@example.com` in `backend/.env`, restart, register with that email, and an **Admin** link appears in the navbar.

## Docker (backend + frontend + PostgreSQL)
```bash
cp .env.example .env      # fill in SECRET_KEY and JWT_SECRET_KEY with long random strings
docker compose up --build
```
App: http://localhost:8080 — API: http://localhost:5000

## Deploying

- **Backend (Render / Railway):** root directory `backend`, build `pip install -r requirements.txt`, start
  `gunicorn run:app --workers 1 --threads 4`. Add a PostgreSQL database and set the env vars above
  (`APP_ENV=production`, both secrets, `DATABASE_URL`, `CORS_ORIGINS=<your frontend URL>`).
- **Frontend (Vercel / Netlify):** root directory `frontend`, build `npm run build`, output `dist`,
  env `VITE_API_URL=<your backend URL>`. `vercel.json` already handles React Router refreshes.
- **Important:** free hosting disks are usually wiped on restart, so uploaded photos disappear.
  For a real deployment use a persistent disk or move uploads to object storage (Cloudinary / S3).

## Security notes
- Passwords hashed with Werkzeug (PBKDF2-SHA256, salted). JWT required on every write endpoint.
- Ownership checks are enforced server-side on edit/delete; reply permission is checked on messages.
- Seller email/phone are never exposed to other users; buyers contact sellers through in-app messages.
- Uploads are identified by their file signature (not the filename the browser claims) and saved under random names.
- Image fields only accept `/uploads/...` or http(s) links.
- Rate limits protect login, register, upload, messaging and reporting.
- Known limits: the JWT lives in localStorage (an httpOnly cookie would be stronger), the email domain check proves the
  *format* of an address, not ownership (that needs an emailed verification link), and rate limiting is per-process memory.

## Not built yet
Ratings and reviews, real-time chat (WebSockets), recommendations, email verification links, OpenAPI/Swagger docs,
frontend automated tests.
