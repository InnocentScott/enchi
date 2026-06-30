# 📚 EnChi — Master English & Chinese with Smart Learning

Welcome to **EnChi** (a blend of **En**glish + **Chi**nese), a comprehensive and interactive mobile language-learning application designed to help users efficiently master English and Mandarin Chinese.

Whether you are starting from scratch or polishing your conversational skills, EnChi offers a structured, engaging, and science-backed approach to language acquisition. By combining curated lesson roadmaps, interactive quizzes, and an advanced Spaced Repetition System (SRS), the platform ensures that the vocabulary and grammar you learn stay firmly in your long-term memory.

### ✨ Key Features

* **Dual-Language Roadmaps:** Carefully structured learning paths for both English and Mandarin Chinese, from absolute beginner to advanced.
* **Smart Flashcards (SRS):** A **SuperMemo-2 (SM-2)** spaced-repetition engine schedules each word for review at the optimal moment — right before you would forget it.
* **Interactive Exercises:** Multiple-choice quizzes and word-matching to reinforce reading and listening.
* **Native Audio Pronunciation:** High-quality audio for every vocabulary word, Pinyin, and example sentence.
* **Gamified Experience:** Daily streaks, experience points (XP), and a competitive leaderboard.
* **Personalized Notebook:** Bookmark your most challenging words for targeted practice.

---

## 🏗️ Architecture (overview)

EnChi is a **monorepo** with two independent apps:

```
enchi/
├── backend/    # Polyglot microservices (the API)
└── mobile/     # React Native + Expo (the client)
```

The backend follows a **pragmatic polyglot microservices** approach — each service is written in the language that best fits its job, owns its **own database** (database-per-service), and is reached by the app through a single **API Gateway**.

| Service | Stack | Port | Responsibility |
|---|---|---|---|
| **auth** | Go | 8001 | Accounts, login/registration, JWT |
| **content** | NestJS + Prisma | 8002 | Courses, lessons, vocabulary, quizzes |
| **progress** | Go + Redis | 8003 | XP, streaks, leaderboard |
| **srs** | Express (TS) | 8004 | Spaced-repetition scheduling (SM-2) |
| **media** | Go | 8005 | Text-to-Speech audio |

**How they talk to each other:**
- **Synchronous** calls go through the **API Gateway** (Traefik), which verifies the JWT and forwards the user identity (`X-User-Id`) to each service — clients never call a service directly.
- **Asynchronous** workflows use **RabbitMQ** events. When a quiz is submitted, `content` emits a `quiz_completed` event; `progress` consumes it to award XP/update streaks, and `srs` consumes it to reschedule the reviewed words. Registration emits `user_registered`.

Infrastructure (PostgreSQL, Redis, RabbitMQ, the gateway, all services) is orchestrated with **Docker Compose**.

> Design rationale: [`implementation_plan_learning_app.md`](./implementation_plan_learning_app.md), [`plan_backend.md`](./plan_backend.md), [`plan_frontend.md`](./plan_frontend.md).

---

## 🧰 Prerequisites

Install these once. Commands assume [winget](https://learn.microsoft.com/windows/package-manager/) on Windows and [Homebrew](https://brew.sh/) on macOS.

| Tool | Windows | macOS |
|---|---|---|
| Git | `winget install Git.Git` | `brew install git` |
| Docker Desktop | `winget install Docker.DockerDesktop` | `brew install --cask docker` |
| Go 1.23+ | `winget install GoLang.Go` | `brew install go` |
| Node.js 20+ | `winget install OpenJS.NodeJS.LTS` | `brew install node` |
| Expo CLI | used via `npx` (no global install) | used via `npx` |

**Windows note:** Docker Desktop requires WSL2. If it isn't installed, run `wsl --install` in an elevated PowerShell and **reboot**, then start Docker Desktop once.

Open a fresh terminal after installing (so `PATH` updates), then verify: `git --version`, `docker --version`, `go version`, `node --version`.

---

## 🚀 Installation & Running

### 1. Clone

```bash
git clone <your-repo-url> enchi
cd enchi
```

### 2. Backend (Docker)

**Create the local env file** (holds secrets + host ports; it is gitignored):

- Windows (PowerShell): `Copy-Item backend/.env.example backend/.env`
- macOS / Linux: `cp backend/.env.example backend/.env`

> **Host ports.** Defaults are the standard ones (gateway `80`, Postgres `5432`, Redis `6379`, RabbitMQ `5672`/`15672`). If any are taken on your machine, edit `backend/.env` and change the `*_HOST_PORT` values. The commands below assume `GATEWAY_HOST_PORT=8088` (set it in `backend/.env`); internal container-to-container ports never change.

**Start the whole stack:**

```bash
docker compose -f backend/docker-compose.yml up -d --build
docker compose -f backend/docker-compose.yml ps
```

This builds and starts PostgreSQL, Redis, RabbitMQ, the Traefik gateway, and all five services. Each service runs its DB migrations on startup.

| Endpoint | URL (with `GATEWAY_HOST_PORT=8088`) |
|---|---|
| API Gateway | http://localhost:8088 |
| Traefik dashboard | http://localhost:8090 |
| RabbitMQ management | http://localhost:15673 (guest / guest) |

**Seed sample content** (one English course — run once). Use the same Postgres host port you configured (default `5432`):

```bash
cd backend/services/content-service
npm install
```
- Windows (PowerShell):
  ```powershell
  $env:CONTENT_DATABASE_URL = "postgres://app:app_password@localhost:5432/content_db?schema=public"; npm run seed
  ```
- macOS / Linux:
  ```bash
  CONTENT_DATABASE_URL="postgres://app:app_password@localhost:5432/content_db?schema=public" npm run seed
  ```
```bash
cd ../../..
```

**Smoke test (optional)** — register through the gateway:

```bash
curl -X POST http://localhost:8088/auth/register -H "Content-Type: application/json" -d "{\"email\":\"me@enchi.dev\",\"password\":\"supersecret123\",\"displayName\":\"Me\"}"
```

Stop everything with `docker compose -f backend/docker-compose.yml down` (add `-v` to also wipe the local data volumes under `backend/.data/`).

### 3. Mobile (Expo)

```bash
cd mobile
npm install
```

Tell the app which gateway URL to call. **`localhost` will NOT work from a phone or emulator** — pick the right host. Expo inlines `EXPO_PUBLIC_*` variables at bundle time, so always restart with `--clear` after changing it.

| Target | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android emulator | `http://10.0.2.2:8088` |
| iOS simulator | `http://localhost:8088` |
| Physical device (Expo Go, same Wi‑Fi) | `http://<your-computer-LAN-IP>:8088` |

- Windows (PowerShell):
  ```powershell
  $env:EXPO_PUBLIC_API_URL = "http://10.0.2.2:8088"; npx expo start --clear
  ```
- macOS / Linux:
  ```bash
  EXPO_PUBLIC_API_URL="http://localhost:8088" npx expo start --clear
  ```

Then scan the QR code with **Expo Go**, or press `a` (Android) / `i` (iOS). Type-check with `npm run typecheck`.

> Find your LAN IP with `ipconfig` (Windows) or `ipconfig getifaddr en0` (macOS). For a physical device, make sure your firewall allows inbound connections on the gateway port, and the backend must be running.

---

## 📁 Repository layout

```text
enchi/
├── backend/
│   ├── docker-compose.yml         # full stack
│   ├── .env.example               # copy to .env
│   ├── gateway/traefik/dynamic/   # routes + jwt-auth (file provider)
│   ├── infra/postgres/            # multi-DB init
│   ├── libs/contracts/            # event JSON Schemas
│   └── services/{auth,content,progress,srs,media}-service/
├── mobile/                        # Expo app (src/{api,features,navigation,store,components,lib})
├── implementation_plan_learning_app.md
├── plan_backend.md
└── plan_frontend.md
```

## ✅ Project status

All five backend services are implemented and verified end-to-end through the gateway; the mobile app's core flows (auth → courses → lesson → quiz → review / leaderboard / profile) are built and type-checked. Each service's `README.md` lists what remains to polish (e.g. plugging a real TTS provider into `media`, enriching the SRS review screen with vocabulary text, content-admin CRUD, UI polish, i18n).

---

## 🤝 Connect with me

Built with ❤️ as a hands-on journey into polyglot microservices and mobile development.

- **GitHub:** [@InnocentScott](https://github.com/InnocentScott)
- **Email:** [kiethohohoho@gmail.com](mailto:kiethohohoho@gmail.com)
- **LinkedIn:** [tkietle1002](https://www.linkedin.com/in/tkietle1002/)
- **Messenger:** [Chat with me](https://www.messenger.com/e2ee/t/6725676397522886)

Issues and pull requests are welcome — feel free to open one if you spot something or want to contribute!
