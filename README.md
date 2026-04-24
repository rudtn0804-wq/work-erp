# 인테리어 현장관리 웹앱 MVP

소규모 인테리어 팀을 위한 캘린더 중심 현장관리 웹앱입니다. 작업자는 모바일에서 오늘 일정, 출퇴근, 작업일지를 빠르게 처리하고, 관리자는 PC에서 일정, 현장, 출근현황, 급여정산을 한눈에 확인하는 흐름을 목표로 합니다.

## 기술스택

- Next.js App Router, TypeScript, Tailwind CSS
- Prisma ORM
- MySQL 로컬 DB
- Zod validation
- JWT 로그인 API 기본 구조

## 로컬 실행

이 프로젝트는 기존 `localhost:8080`을 사용하지 않습니다. 개발 서버는 `3101` 포트를 사용합니다.

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

접속 주소:

```text
http://localhost:3101
```

## 환경변수

`.env` 기본값은 로컬 MySQL root 계정 기준입니다.

```text
DATABASE_URL="mysql://root@localhost:3306/work_erp"
JWT_SECRET="local-interior-field-secret"
NEXT_PUBLIC_APP_PORT="3101"
ADMIN_SETUP_TOKEN="change-this-before-production"
```

## DB

문서의 PostgreSQL 초안을 현재 PC에 설치된 MySQL에 맞춰 Prisma schema로 구성했습니다.

- `users`: 관리자, 반장, 작업자
- `sites`: 현장
- `schedules`: 현장 일정
- `schedule_workers`: 일정별 작업자 배정
- `attendance`: 출근/퇴근/공수
- `work_logs`: 작업일지
- `work_log_photos`: 작업 사진 URL
- `payrolls`: 월별 급여정산
- `notifications`: 공지/알림

## 샘플 로그인

```text
admin@field.local / password1234
leader@field.local / password1234
worker1@field.local / password1234
```

## API 초안

- `POST /api/auth/login`
- `GET /api/dashboard/summary`
- `GET, POST /api/sites`
- `GET, POST /api/schedules`
- `POST /api/attendance/check-in`
- `POST /api/attendance/check-out`
- `GET, POST /api/work-logs`
- `GET /api/payrolls?yearMonth=YYYY-MM`
- `GET /api/notifications`

## 다음 확장 후보

- 실제 로그인 세션과 역할별 화면 보호
- shadcn/ui 기반 CRUD 폼과 모달
- 사진 업로드 스토리지 연동
- 일정 반복 등록, 엑셀 다운로드
- PWA 설치와 모바일 홈 화면 최적화
