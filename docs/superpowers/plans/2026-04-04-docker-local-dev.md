# Docker Local Development Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Docker Compose support so `docker-compose up` starts the full Flask + React stack locally with one command.

**Architecture:** Two containers (`backend`, `frontend`) on a shared Docker network. Backend mounts the project root as `/app`; frontend mounts `./frontend` with an isolated `node_modules` volume. Named volumes persist SQLite data and ML model caches across restarts.

**Tech Stack:** Python 3.12-slim, Node 20-alpine, Flask debug mode, Vite dev server with HMR, Docker Compose v2.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `backend/Dockerfile` | Build Python image with system + pip deps |
| Create | `backend/.dockerignore` | Exclude pycache/tests from build context |
| Create | `frontend/Dockerfile` | Build Node image with npm deps |
| Create | `frontend/.dockerignore` | Exclude node_modules/dist from build context |
| Create | `docker-compose.yml` | Orchestrate both services, volumes, network |
| Create | `.env.example` | Document required env vars |
| Modify | `frontend/vite.config.js` | Change proxy target to `http://backend:5000` |

---

## Task 1: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Create `backend/.dockerignore`**

```
__pycache__
**/__pycache__
*.pyc
.pytest_cache
data/
tests/
```

- [ ] **Step 2: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

# OpenCV runtime dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps as a cached layer (source is bind-mounted at runtime)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```

- [ ] **Step 3: Verify the image builds**

Run from project root:
```bash
docker build -t attendance-backend-test ./backend
```
Expected: image builds successfully, no errors about missing packages.

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "feat: add backend Dockerfile for local dev"
```

---

## Task 2: Frontend Dockerfile

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`

- [ ] **Step 1: Create `frontend/.dockerignore`**

```
node_modules
dist
```

- [ ] **Step 2: Create `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install deps as a cached layer (source is bind-mounted at runtime)
COPY package.json package-lock.json* ./
RUN npm install
```

- [ ] **Step 3: Verify the image builds**

```bash
docker build -t attendance-frontend-test ./frontend
```
Expected: image builds, `npm install` completes without errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/Dockerfile frontend/.dockerignore
git commit -m "feat: add frontend Dockerfile for local dev"
```

---

## Task 3: Update Vite Proxy for Docker Networking

**Files:**
- Modify: `frontend/vite.config.js`

Inside Docker, the frontend container resolves `backend` by container name. The current proxy target (`http://127.0.0.1:5000`) won't work because `127.0.0.1` inside the frontend container points to itself, not Flask.

- [ ] **Step 1: Update proxy target in `frontend/vite.config.js`**

Change line 8 from:
```js
"/api": "http://127.0.0.1:5000",
```
to:
```js
"/api": {
  target: "http://backend:5000",
  changeOrigin: true,
},
```

The full file should look like:
```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://backend:5000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    globals: true,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/vite.config.js
git commit -m "fix: update Vite proxy to use Docker service name"
```

---

## Task 4: Create docker-compose.yml and .env.example

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Create `.env.example`**

```
# Copy this file to .env and fill in values
SECRET_KEY=change-me-to-a-random-string
```

- [ ] **Step 2: Create `.env` for local use** (gitignored — do not commit)

```
SECRET_KEY=local-dev-secret-key-replace-in-prod
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
services:
  backend:
    build:
      context: ./backend
    working_dir: /app
    volumes:
      # Bind-mount entire project root so backend/run.py and yolov12n-face.pt are accessible
      - ./:/app
      # Named volume for persistent data (SQLite, checkin images, face images)
      - backend-data:/app/backend/data
      # ML model caches — avoids re-downloading on every restart
      - deepface-cache:/root/.deepface
      - ultralytics-cache:/root/.config/Ultralytics
    environment:
      - FLASK_APP=backend/run.py
      - FLASK_DEBUG=1
      - SECRET_KEY=${SECRET_KEY}
    command: flask run --host=0.0.0.0 --port=5000 --reload
    networks:
      - app-net

  frontend:
    build:
      context: ./frontend
    working_dir: /app
    volumes:
      # Bind-mount frontend source for HMR
      - ./frontend:/app
      # Keep node_modules inside the container (Linux paths, avoids Windows conflicts)
      - frontend_node_modules:/app/node_modules
    ports:
      - "5173:5173"
    command: npm run dev -- --host
    networks:
      - app-net
    depends_on:
      - backend

networks:
  app-net:

volumes:
  backend-data:
  deepface-cache:
  ultralytics-cache:
  frontend_node_modules:
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: add docker-compose for local dev"
```

---

## Task 5: Smoke Test — Verify Full Stack

This task has no code changes. It verifies everything works end-to-end.

- [ ] **Step 1: Build and start everything**

```bash
docker-compose up --build
```

Expected first-run output (order may vary):
- Backend: pip installs OpenCV, DeepFace, Ultralytics (~5-10 min first time)
- Frontend: npm installs packages
- Backend: `* Running on http://0.0.0.0:5000`
- Frontend: `VITE vX.X.X  ready in XXXms` and `Local: http://localhost:5173/`

- [ ] **Step 2: Verify backend health endpoint**

In a new terminal:
```bash
curl http://localhost:5173/api/health
```
Expected: `{"status": "ok"}` (or similar JSON from your health route)

- [ ] **Step 3: Verify frontend loads in browser**

Open `http://localhost:5173` in your browser.
Expected: The React app loads without errors in the browser console.

- [ ] **Step 4: Verify camera check-in page works**

Navigate to the guest check-in page and allow camera access.
Expected: Camera feed appears (browser allows camera on `localhost`).

- [ ] **Step 5: Verify HMR works**

Edit any frontend file (e.g., change a text string in a component).
Expected: Browser updates automatically without a full page reload.

- [ ] **Step 6: Verify Flask reload works**

Edit any backend file (e.g., add a comment to `backend/app/routes/health.py`).
Expected: Terminal shows `* Detected change in '...', reloading` and Flask restarts.

- [ ] **Step 7: Verify data persistence**

```bash
docker-compose down
docker-compose up
```
Expected: SQLite database and any previously stored data still exist after restart.

- [ ] **Step 8: Clean up test images**

```bash
docker rmi attendance-backend-test attendance-frontend-test 2>/dev/null || true
```

---

## Notes

- **Slow first build:** `pip install deepface ultralytics opencv-python` downloads several hundred MB. After the first `docker-compose up --build`, subsequent starts take ~10 seconds.
- **Model downloads:** DeepFace and Ultralytics download model weights on first inference. These are cached in the `deepface-cache` and `ultralytics-cache` named volumes.
- **Wiping data:** `docker-compose down -v` removes all volumes including the SQLite database.
- **Rebuilding after dependency changes:** If you add a package to `requirements.txt` or `package.json`, run `docker-compose up --build` to rebuild the image layers.
