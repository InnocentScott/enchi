# 📚 Implementation Plan: Project 1 - Language Learning App

This project leans toward managing a large volume of content (Content Management) and a spaced-repetition algorithm (Spaced Repetition). A **Pragmatic Polyglot Microservices** architecture is applied per your rule: Easy → Golang, Medium → NestJS, Hard → ExpressJS.

---

## 1. Tech Stack Allocation per Service

### 🟢 1. Auth & User Service
*   **Tech Stack:** `Golang`
*   **Difficulty:** Easy
*   **Why:** Manages accounts, login/registration, and JWT token creation. Very basic — use Golang to gain experience working with a Database and Auth logic in Go.

### 🟢 2. Progress & Leaderboard Service
*   **Tech Stack:** `Golang`
*   **Difficulty:** Easy
*   **Why:** Its job is to record the lessons a user has completed, add XP points, and maintain the Streak. The leaderboard needs fast ranking queries (typically using Redis Sorted Sets). Golang handles I/O and Redis operations extremely fast.

### 🟢 3. Media Service (Text-to-Speech)
*   **Tech Stack:** `Golang`
*   **Difficulty:** Easy
*   **Why:** Takes English/Chinese text, calls the Google/Azure Text-to-Speech API to get an audio file, compresses it, and uploads it to Cloudflare R2. File-stream manipulation tasks are a great fit for Golang.

### 🟡 4. Content Service (Lessons, Vocabulary, Quiz)
*   **Tech Stack:** `Node.js (NestJS)`
*   **Difficulty:** Medium
*   **Why:** The learning data is highly relational: Course → Lesson → Vocabulary list → Quiz questions (multiple choice, matching). NestJS combined with an ORM (such as TypeORM/Prisma) handles deep data relationships and DTO Validation far better than Go.

### 🔴 5. Spaced Repetition Service (SRS - Review algorithm)
*   **Tech Stack:** `Node.js (ExpressJS)` or `NestJS`
*   **Difficulty:** Hard (in terms of algorithmic logic)
*   **Why:** This is the service that computes "Which vocabulary does the user need to review today?". It needs to apply the SM-2 (SuperMemo) algorithm or similar, based on the difficulty of each word and the history of correct/incorrect answers. Depending on how much complexity you want to push, you can use **ExpressJS** if you want the freedom to code the algorithm flexibly, or **NestJS** if you want to keep it within a standardized framework.

*(Note: A language learning app has few "Hard" features related to systems engineering such as Real-time, so ExpressJS is used here for the most complex logic.)*

---

## 2. Communication Architecture (Inter-service Communication)

*   **REST API:** For the client app to call and fetch lesson data, vocabulary, and submit quiz results.
*   **RabbitMQ:** For asynchronous processing.
    *   *Example:* When a user submits Quiz results (Content Service), the system throws a `quiz_completed` event into RabbitMQ. The *Progress Service* picks up the event to add XP points, and the *SRS Service* picks up the event to recompute the next review date for those vocabulary words.

---

## 3. Project Structure (Monorepo)

```text
language-app-project/
├── frontend/
│   └── mobile-app/      (React Native)
├── services/
│   ├── auth-service/    (Golang)
│   ├── progress-service/(Golang)
│   ├── media-service/   (Golang)
│   ├── content-service/ (NestJS)
│   └── srs-service/     (ExpressJS)
└── docker-compose.yml   (PostgreSQL + Redis + RabbitMQ)
```

---

## ⚠️ User Review Required

Please review the following:
1. Do you want to add any Real-time features to the Language Learning App? (For example: a 1vs1 vocabulary duel — if so, this is definitely an excellent playground for **ExpressJS + Socket.io**).
2. If this architecture looks reasonable, please approve it so we can move to the next step.
