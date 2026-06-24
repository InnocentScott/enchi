# 📚 Implementation Plan: Dự án 1 - App Học Ngôn Ngữ

Dự án này thiên về quản lý nội dung số lượng lớn (Content Management) và thuật toán nhắc lại (Spaced Repetition). Kiến trúc **Pragmatic Polyglot Microservices** được áp dụng theo quy tắc của bạn: Dễ → Golang, Tầm Trung → NestJS, Khó → ExpressJS.

---

## 1. Phân bổ Tech Stack cho từng Service

### 🟢 1. Auth & User Service
*   **Tech Stack:** `Golang`
*   **Độ khó:** Dễ
*   **Tại sao:** Quản lý tài khoản, đăng nhập/đăng ký, tạo JWT token. Rất cơ bản, dùng Golang để lấy kinh nghiệm thao tác với Database và Auth logic trong Go.

### 🟢 2. Progress & Leaderboard Service
*   **Tech Stack:** `Golang`
*   **Độ khó:** Dễ
*   **Tại sao:** Nhiệm vụ là ghi nhận bài học user đã hoàn thành, cộng điểm XP, và duy trì chuỗi Streak. Leaderboard cần query dữ liệu xếp hạng nhanh chóng (thường dùng Redis Sorted Sets). Golang xử lý I/O và Redis operations siêu tốc.

### 🟢 3. Media Service (Text-to-Speech)
*   **Tech Stack:** `Golang`
*   **Độ khó:** Dễ
*   **Tại sao:** Lấy text tiếng Anh/Trung, gọi API của Google/Azure Text-to-Speech để lấy file audio, nén lại và upload lên Cloudflare R2. Tác vụ thao tác với file stream rất phù hợp với Golang.

### 🟡 4. Content Service (Bài học, Từ vựng, Quiz)
*   **Tech Stack:** `Node.js (NestJS)`
*   **Độ khó:** Tầm Trung
*   **Tại sao:** Dữ liệu học tập có quan hệ rất phức tạp: Khóa học → Bài học → Danh sách từ vựng → Các câu hỏi Quiz (Multiple choice, matching). NestJS kết hợp ORM (như TypeORM/Prisma) giúp quản lý các quan hệ dữ liệu sâu và Validation DTO tốt hơn hẳn so với Go.

### 🔴 5. Spaced Repetition Service (SRS - Thuật toán ôn tập)
*   **Tech Stack:** `Node.js (ExpressJS)` hoặc `NestJS`
*   **Độ khó:** Khó (Về mặt logic thuật toán)
*   **Tại sao:** Đây là service tính toán xem "Hôm nay user cần ôn lại những từ vựng nào?". Nó cần áp dụng thuật toán SM-2 (SuperMemo) hoặc tương tự dựa trên độ khó của từ và lịch sử trả lời đúng/sai. Tùy vào độ phức tạp bạn muốn đẩy lên, có thể dùng **ExpressJS** nếu bạn muốn tự do code thuật toán một cách linh hoạt, hoặc **NestJS** nếu muốn giữ nó trong khuôn khổ chuẩn chỉnh.

*(Lưu ý: App học ngôn ngữ ít có tính năng "Khó" liên quan tới kỹ thuật hệ thống như Real-time, nên ExpressJS ở đây được dùng cho phần logic phức tạp nhất).*

---

## 2. Kiến trúc Giao tiếp (Inter-service Communication)

*   **REST API:** Dành cho việc App client gọi lấy dữ liệu bài học, từ vựng, nộp kết quả quiz.
*   **RabbitMQ:** Dành cho việc xử lý bất đồng bộ.
    *   *Ví dụ:* Khi user nộp kết quả làm Quiz (Content Service), hệ thống sẽ ném 1 event `quiz_completed` vào RabbitMQ. *Progress Service* nhặt event để cộng điểm XP, và *SRS Service* nhặt event để cập nhật lại ngày ôn tập tiếp theo cho các từ vựng đó.

---

## 3. Cấu trúc Project (Monorepo)

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

Bạn hãy xem xét:
1. Bạn có muốn thêm tính năng Real-time nào cho App Học Ngôn Ngữ không? (Ví dụ: Thách đấu từ vựng 1vs1 — nếu có, đây chắc chắn là đất diễn cực tốt cho **ExpressJS + Socket.io**).
2. Nếu kiến trúc này đã hợp lý, xin hãy duyệt để sang bước tiếp theo.
