# 📚 EnChi — Master English & Chinese with Smart Learning

Welcome to **EnChi** (a blend of **En**glish + **Chi**nese), a comprehensive and interactive mobile language-learning application designed to help users efficiently master English and Mandarin Chinese.

Whether you are starting from scratch or polishing your conversational skills, EnChi offers a structured, engaging, and science-backed approach to language acquisition. By combining curated lesson roadmaps, interactive quizzes, and an advanced Spaced Repetition System (SRS), the platform ensures that the vocabulary and grammar you learn stay firmly in your long-term memory.

### ✨ Key Features

* **Dual-Language Roadmaps:** Follow carefully structured learning paths tailored for both English and Mandarin Chinese, guiding you from absolute beginner to advanced proficiency.
* **Smart Flashcards (SRS):** Supercharge your vocabulary retention with a **SuperMemo-2 (SM-2)** inspired Spaced Repetition System. The algorithm automatically schedules each word for review at the optimal moment — right before you would forget it.
* **Interactive Exercises:** Reinforce reading and listening through multiple-choice quizzes, word-matching mini-games, and sentence-building exercises.
* **Native Audio Pronunciation:** Improve listening comprehension with crystal-clear, high-quality audio for every vocabulary word, Pinyin, and example sentence.
* **Gamified Experience:** Stay motivated and build consistent habits with daily streaks, experience points (XP), and a competitive weekly leaderboard.
* **Personalized Notebook:** Bookmark your most challenging words into a custom dictionary for quick, targeted practice.

---

## 🏗️ Architecture (overview)

EnChi is a **monorepo** containing two independent apps:

```
enchi/
├── backend/    # Polyglot microservices (the API)
└── mobile/     # React Native + Expo (the client)
```

The backend follows a **pragmatic polyglot microservices** approach — each service is written in the language that best fits its job, owns its **own database** (database-per-service), and is reached by the app through a single **API Gateway**.

| Service | Stack | Responsibility |
|---|---|---|
| **auth** | Go | Accounts, login/registration, JWT |
| **content** | NestJS | Courses, lessons, vocabulary, quizzes |
| **progress** | Go | XP, streaks, leaderboard (Redis) |
| **srs** | Express (TS) | Spaced-repetition scheduling (SM-2) |
| **media** | Go | Text-to-Speech audio (Cloudflare R2) |

**How they talk to each other:**
- **Synchronous** calls go through the **API Gateway** (Traefik), which verifies the JWT and forwards the user identity to each service — clients never call a service directly.
- **Asynchronous** workflows use **RabbitMQ** events. For example, when a quiz is submitted, the Content service emits a `quiz_completed` event; the Progress service consumes it to award XP, and the SRS service consumes it to reschedule the reviewed words.

Infrastructure (PostgreSQL, Redis, RabbitMQ, the gateway, and all services) is orchestrated with **Docker Compose**.

> Want the full design rationale? See [`implementation_plan_learning_app.md`](./implementation_plan_learning_app.md), [`plan_backend.md`](./plan_backend.md), and [`plan_frontend.md`](./plan_frontend.md).

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) + Docker Compose
- [Go](https://go.dev/) 1.23+ (for backend service development)
- [Node.js](https://nodejs.org/) 20+ and [Expo](https://expo.dev/) (for the mobile app)

### 1. Run the backend

```bash
cd backend
cp .env.example .env          # then edit secrets as needed
docker compose up -d          # Postgres + Redis + RabbitMQ + gateway + services
docker compose ps
```

| Endpoint | URL |
|---|---|
| API Gateway | http://localhost (routes by path, e.g. `/auth/login`, `/courses`) |
| RabbitMQ management | http://localhost:15672 |

> If those ports clash with another project on your machine, override the host ports in `backend/.env` (`POSTGRES_HOST_PORT`, `RABBITMQ_HOST_PORT`, `GATEWAY_HOST_PORT`, …) — internal communication is unaffected.

### 2. Run the mobile app

```bash
cd mobile
npx create-expo-app@latest . --template blank-typescript   # first-time setup
npm install
npm start                     # open in Expo Go or an emulator
```

Point the app at the gateway via `EXPO_PUBLIC_API_URL` (see [`mobile/README.md`](./mobile/README.md)).

> **Project status:** all five backend services (auth, content, progress, srs, media) are implemented and verified end-to-end through the gateway, and the mobile app's core flows (auth → courses → lesson → quiz → review/leaderboard/profile) are built and type-checked. See each service's README for what remains to polish.

---

## 🤝 Connect with me

Built with ❤️ as a hands-on journey into polyglot microservices and mobile development.

- **GitHub:** [@InnocentScott](https://github.com/InnocentScott)
- **Email:** [kiethohohoho@gmail.com](mailto:kiethohohoho@gmail.com)
- **LinkedIn:** [tkietle1002](https://www.linkedin.com/in/tkietle1002/)
- **Messenger:** [Chat with me](https://www.messenger.com/e2ee/t/6725676397522886)

Issues and pull requests are welcome — feel free to open one if you spot something or want to contribute!
