# Full-Stack LMS (YouTube-Based)

Production-ready starter LMS with:
- Roles: `STUDENT`, `INSTRUCTOR`, `ADMIN`
- JWT authentication + role-based authorization
- Course listing and details pages
- Enrollment flow
- Learning page with YouTube iframe lessons, sequential navigation, and progress tracking
- Backend-controlled course structure and lesson ordering
- Database-backed progress/resume logic

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database/ORM: Prisma + SQLite (easy local start; can switch datasource for Postgres in production)

## Project Structure
- `frontend/` React app
- `backend/` API server + Prisma schema + seed data

## Database Models
- `User` (role-based)
- `Course`
- `Section`
- `Lesson` (stores only metadata: title/order/video ID + URL/duration)
- `Enrollment`
- `Progress` (`user_id`, `course_id`, `lesson_id`, `status`, timestamps)

## API Highlights
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/courses`
- `GET /api/courses/:courseId`
- `POST /api/courses/:courseId/enroll`
- `GET /api/courses/:courseId/learn`
- `POST /api/progress` (store lesson status updates)
- `GET /api/progress/:courseId`

## Local Setup
1. Backend
```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

2. Frontend
```bash
cd frontend
npm install
npm run dev
```

3. Open:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Seed Accounts
- Student: `student@lms.dev` / `Password123!`
- Instructor: `instructor@lms.dev` / `Password123!`
- Admin: `admin@lms.dev` / `Password123!`

## How Learning Flow Works
1. Frontend requests learning metadata from `GET /api/courses/:courseId/learn`.
2. Backend returns ordered sections/lessons + YouTube metadata + user progress snapshot.
3. Frontend embeds selected lesson via `https://www.youtube.com/embed/<videoId>`.
4. On lesson interactions/completion, frontend posts to `POST /api/progress`.
5. Backend updates `Progress` and frontend reflects completed lessons + percentage.
6. Resume uses latest watched lesson/progress state.

## Notes
- YouTube hosts video content only.
- Lesson order and access structure are enforced by backend + database.
- Frontend never stores video files, only consumes metadata and embed IDs/URLs.
