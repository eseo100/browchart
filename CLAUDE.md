# BrowChart — 프로젝트 컨텍스트

이 파일은 새 Claude Code 세션이 시작될 때 자동으로 읽혀요.
이전 세션의 모든 결정과 진척이 여기 정리되어 있습니다.

---

## 1. 사용자 프로필

- **이름**: 장미나 (이메일: jangmina7@naver.com)
- **직업**: 미용사 (현재 미나헤어 운영) + 향후 반영구 메이크업 시술자
- **기술 수준**: **비기술자**. 한국어로 대화. 단순함 선호.
- **운영 환경**: Windows 11, VS Code, Git Bash, iPad (Apple Pencil)
- **별개 프로젝트**: `d:\min-chart\` (미용실 본인용. 판매 안 함)

**대화 시 주의:**
- 너무 자세히 설명하면 부담 → 핵심만 짧게
- 한 번에 너무 많은 옵션 주지 말고 한 가지 추천 + 진행
- 화면 상태 자주 확인 (사용자가 진행 단계 헷갈릴 수 있음)
- 에러 발생 시 영문 메시지 그대로 받아서 진단

---

## 2. BrowChart 프로젝트 개요

- **무엇을**: 눈썹문신 / 입술문신 / 속눈썹펌 시술자용 차트 + 예약 + 동의서 + 리터치 관리 SaaS
- **누구에게**: 반영구 메이크업 1인 매장 사장님들
- **수익 모델**: 월 구독 (스타터 19,000원 / 프로 39,000원 / 비즈니스 69,000원 검토 중)
- **시작점**: 본인 눈썹문신 사업에서 예약 받기부터
- **확장 순서**: 눈썹문신 → 속눈썹펌 → 입술문신
- **앱 이름 결정 (2026-04-29)**: BrowChart (Brow + Chart)

### 시장 조사 결과
- **가장 큰 경쟁자: 콜라보살롱(Colavo)** — 무료, 미국 진출, 통합형
- 차별화 핵심: "통합형 vs 반영구 전용". 시술자가 직접 만든 깊이 있는 도구
- 사용자 다음 액션: 콜라보살롱 직접 사용해보고 부족한 점 메모 (아직 안 함)

### 7대 차별 기능
1. 시안 페이지 (얼굴 사진 위 디자인 그리기)
2. 시술 전/후 사진 비교 슬라이더
3. 눈썹 모양 라이브러리
4. 부위별 차트 (눈썹/속눈썹/입술 각기 다름)
5. 모듈형 동의서 + 전자서명
6. 리터치 자동 알림 (4~6주 후)
7. 컬러/디자인 라이브러리

---

## 3. 디자인 톤 (결정됨)

**톤 C — 따뜻한 베이지 + 핑크 포인트**

### 컬러 팔레트 (CSS 변수)
- 메인 배경: `#FAF6F1` (누드)
- 카드 배경: `#F5EFE6` (크림 라이트)
- 메인 브라운: `#6B4F3A` (`--salon-primary`로 매장 커스터마이징)
- 진한 텍스트: `#3D2E20`
- 포인트 핑크: `#E8A598` (`--salon-accent`)
- 라이트 핑크: `#F5D5CC`
- 보더 그레이지: `#E5DDD0`

### 폰트
- **본문 한글**: Pretendard Variable (jsdelivr CDN, layout head에 link)
- **영문 로고/제목**: Space Grotesk (next/font/google)
- **굵기 위계**: light(300) / regular(400) / medium(500) / semibold(600) / bold(700)
- 사용자 피드백: "AI 통일화 느낌 줄이고 전문적/각진 느낌" → 위 조합으로 변경됨

---

## 4. 기술 스택

| 역할 | 도구 |
|---|---|
| 프레임워크 | **Next.js 16.2.4 (Turbopack)** ← 주의: AGENTS.md 참고. 기존 Next와 다름 |
| UI | React 19.2.4 |
| DB / 인증 | Supabase (`@supabase/supabase-js` ^2.104.0) |
| 스타일 | Tailwind CSS v4 |
| 메시지 | solapi (SMS, 추후 알림톡) |
| 인터랙션 | react-zoom-pan-pinch (사진/시안용) |

### 주요 결정
- 예약금: PG 연동 X, **계좌입금 확인형**으로 시작 (DB는 `payment_method`, `pg_payment_id` 필드 미리 열어둠)
- 메시지: SMS 우선, 알림톡은 `message_channel` 필드로 구조만 열어둠
- 매장 컬러 커스터마이징: **CSS 변수 방식** (Tailwind 정적 클래스로 안 됨)
- 마이페이지: 회원가입 X, 토큰 URL 기반 (예: `/mypage?token=abc123`)
- 권한: `super_admin` / `salon_owner` / `staff` / `customer_guest` (MVP 1차는 owner만)
- 동의서 PDF: 한국어 폰트 임베딩 작업 있음 → MVP 2차로 미룸
- 사진 비교: AI 보정 X, 수동 before/after 슬라이더만

---

## 5. Supabase 셋업 (완료됨)

- 프로젝트 ID: **zyysbzdqsuwcufikrrsv**
- Region: Northeast Asia (Seoul)
- RLS 자동 활성화: **ON**
- 이메일 confirmation: **OFF** (개발용)
- 환경변수 `.env.local`에 채워짐:
  - `NEXT_PUBLIC_SUPABASE_URL=https://zyysbzdqsuwcufikrrsv.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...` (anon JWT)

### 적용된 SQL
- ✅ `sql/01_auth_schema.sql` — salons + profiles + RLS 정책 + updated_at 트리거
- ✅ `sql/02_menus.sql` — menus 테이블 + RLS (owner 관리, anon 조회)
- ✅ `sql/03_bookings.sql` — bookings 테이블 + RLS + access_token 자동 생성
- ✅ `sql/04_slot_blocking.sql` — booking_slots view (개인정보 X, 충돌체크용) + get_booking_by_token RPC
- ✅ (인라인) anon+authenticated 둘 다 booking insert 허용으로 정책 수정
- ✅ (인라인) `get_bookings_by_phone(p_salon_slug, p_phone)` RPC — 손님 폰번호로 본인 예약 조회
- ✅ `sql/05_customers.sql` — customers 테이블 + 트리거 2개 (예약 시 자동 등록 + 시술완료 시 통계갱신) + 백필
- ✅ `sql/06_chart_extras.sql` — allergies_tags / design_tags / color_tags / notes_drawing 컬럼 추가
- ✅ `sql/07_staff_pin.sql` — salons.staff_pin 컬럼
- ✅ `sql/08_business_hours.sql` — salons.open_hour / close_hour (영업시간)
- ✅ `sql/09_consents.sql` — consents 테이블 + RLS (전자서명 동의서)
- ✅ `sql/10_customer_drawings.sql` — customers.allergies_drawing / design_drawing (고객모드 펜 그림)
- ✅ `sql/11_customer_numbers.sql` — customers.customer_number 컬럼 + 트리거 (매장별 #1, #2 자동부여)

---

## 6. 완성된 페이지 (작동 확인됨)

### 원장 영역 (로그인 필요)
- `/` — 랜딩 (히어로 + 9개 기능 카드)
- `/login` — 로그인
- `/signup` — 회원가입 (이메일+비번+비번확인+원장명+매장명+slug)
- `/dashboard` — 대시보드. **실시간 통계** (오늘/이번주/확인대기, 클릭하면 예약관리로 이동) + 메뉴 카드
- `/dashboard/menus` — 시술 메뉴 CRUD. 6개 카테고리(눈썹/입술/속눈썹/리터치/제거/기타) 항상 표시
- `/dashboard/bookings` — **예약 관리**. 상태 필터 탭 + 카드 목록 + 펼쳐서 상세보기 + 액션 버튼(확정/취소/완료/노쇼/되돌리기) + 입금 확인 토글
- `/dashboard/customers` — **고객 목록**. 검색(이름/전화) + 정렬(최근방문/방문많음/리터치임박/이름순). 리터치 7일내 핑크 강조
- `/dashboard/customers/[id]` — **고객 차트**. 두 영역 분리:
  - 💁 **고객 상담 차트** (현장에서 손님이 iPad로 직접 입력) — 피부타입 / 알러지 / 원하는 디자인 / 원하는 컬러
  - 👩‍⚕️ **고객 진단 차트** (원장 진단) — 진단 메모(키보드) + 디자인 시안(펜 캔버스, Apple Pencil 지원)
  - 우측 상단 **💁 고객 모드** 버튼 → 전체 화면 오버레이로 전환 (PIN 미설정이면 자동 설정 모달)
  - 고객 모드 빠져나오기 = 직원 PIN 입력 (틀리면 흔들림)
- `/dashboard/settings` — **매장 설정**. 매장 정보(읽기전용) + 직원 PIN 설정/변경. 추후 영업시간/인사말 등 추가 예정

### 손님 영역 (로그인 X)
- `/booking/[slug]` — 매장 메뉴 목록 (예: `/booking/minabrow`). 활성 메뉴 카테고리별 표시 + 예약하기 버튼 + **우측 상단 "📋 내 예약 조회"**
- `/booking/[slug]/new?menu=xxx` — 예약 신청 폼. 손님정보 + 시술경험 + 달력/시간슬롯 + 동의
  - 달력: 네이버 스타일 월별 그리드, 지난날짜 회색, 일/토 색 구분
  - 시간슬롯: 30분 단위 고정, 영업 10:00~19:00 (하드코딩, 추후 매장 설정으로)
  - **시간 충돌 자동 체크**: 메뉴 duration_minutes 만큼 점유 → 같은 날 기존 예약과 겹치면 회색 "예약됨"
  - **선택 범위 시각화**: 시작 슬롯=warmbrown, 시술 진행 슬롯=roselight + "진행중"
  - access_token은 클라이언트에서 생성 (anon SELECT 정책 닫혀있어서)
- `/booking/[slug]/done?token=xxx` — 신청 완료 + 입금 안내. `get_booking_by_token` RPC로 본인 예약 조회
- 매장 페이지 모달: **내 예약 조회** — 폰번호 입력 → `get_bookings_by_phone` RPC로 본인 예약만 표시 (개인정보 차단)

### 첫 매장 (사용자 본인)
- 매장명: **미나브로우**
- slug: `minabrow`
- 손님 예약링크: `localhost:3002/booking/minabrow`

---

## 7. 폴더 구조

```
d:\browchart\
├── CLAUDE.md                  ← 이 파일
├── package.json               (dev 포트: 3002)
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── .env.local                 (Supabase 키, gitignore됨)
├── .env.local.example
├── .gitignore
├── sql/
│   ├── 01_auth_schema.sql    ✅ 적용됨
│   ├── 02_menus.sql          ✅ 적용됨
│   ├── 03_bookings.sql       ✅ 적용됨
│   └── 04_slot_blocking.sql  ✅ 적용됨
├── lib/
│   └── supabase.ts
└── app/
    ├── layout.tsx             (Pretendard CDN + Space Grotesk)
    ├── globals.css            (CSS 변수, .btn-primary 등)
    ├── page.tsx               (랜딩)
    ├── login/page.tsx
    ├── signup/page.tsx
    ├── dashboard/
    │   ├── layout.tsx         (AuthGuard 래핑)
    │   ├── auth-guard.tsx
    │   ├── page.tsx
    │   └── menus/
    │       ├── page.tsx       (카테고리별 목록 + CRUD)
    │       └── menu-form.tsx  (추가/수정 모달)
    └── booking/[slug]/
        ├── page.tsx           (손님용 매장 + 메뉴)
        ├── new/
        │   ├── page.tsx       (예약 신청 폼)
        │   └── datetime-picker.tsx (달력+시간슬롯, 충돌체크)
        └── done/
            └── page.tsx       (완료 + 입금 안내)
```

---

## 8. 진행 중 (현재 작업)

**MVP 1차 핵심 거의 완성 (2026-05-10 마무리)** — 예약 → 고객 차트 → 동의서 → 고객 모드 한 바퀴 돔

### 다음 세션 즉시 시작할 것
1. 🔴 **고객 모드 펜 그림이 차트 페이지에 안 보임** — DB 저장은 되는데 미나님 차트에선 빈 칸. 빠른 마무리 (30분 내).
2. 🔴 **시술 전/후 사진** — Storage 셋업 + 갤러리 + 비교 슬라이더. 7대 차별 핵심. (2~3시간)

### 자세한 회고/명세 비교/개발자 시점 분석
👉 **`d:\browchart\회고-2026-05-10.md`** 참조. 다음 세션 시작 시 이 파일 한 번 읽으면 어디서 출발할지 명확.

---

## 9. 다음 세션 우선순위 (큰 흐름)

1. ✅ ~~로그인 + 회원가입 + 매장 생성~~
2. ✅ ~~시술 메뉴 등록~~
3. ✅ ~~손님 예약링크 페이지~~ (`/booking/[slug]`)
4. ✅ ~~손님 예약 신청 폼~~ (달력/시간슬롯/충돌체크/완료)
5. ✅ ~~원장 예약 관리~~ (`/dashboard/bookings`)
6. ✅ ~~손님 본인 예약 조회~~ (매장 페이지 모달, 폰번호 기반)
7. ✅ ~~고객 차트 (상담/진단 분리, 칩, 펜 시안)~~
8. ✅ ~~고객 모드 + 직원 PIN + 매장 설정 페이지~~
9. ⏳ 시술 전/후 사진 업로드 (Storage 버킷 셋업 + 갤러리 + 비교 슬라이더)
10. ⏳ 영업시간 설정 (매장 설정 확장 — 현재 하드코딩된 10~19 동적화)
11. ⏳ SMS 알림 (solapi, 매장별 API 키 입력형)
12. ⏳ 동의서 모듈 시스템 (시술 당일 작성)
13. ⏳ 다중 매장 지원 (한 계정이 여러 slug 운영)
14. ⏳ 카카오 OAuth (선택)
15. ⏳ 결제/구독 시스템 (포트원 또는 토스페이먼츠) — MVP 후순위

## 9.5. 결정된 솔라피 방향 (2026-05-10)
- **B안: 매장별 솔라피 키 입력형**으로 결정
- 각 매장 사장님이 본인 솔라피 가입 + 본인 사업자번호로 발신번호 인증
- BrowChart 매장 설정에 API Key/Secret/발신번호 입력란
- 비용/책임 깔끔하고, 손님이 매장 본인 번호로 받음
- BrowChart는 마진 없이 단순 발송 중계만

---

## 10. 참고 문서 (사용자가 만든 것)

- `d:\min-chart\눈썹문신-SaaS-정리.html` — 사업 큰 그림 + 4대 전략 (인쇄용)
- `d:\min-chart\눈썹문신-개발명세서.html` — MVP 1차~3차 22챕터 전체 명세 (코드 작업 참조용)

---

## 11. 사용자 자주 묻는 것 (대비)

- **"OOO 어떻게 들어가?"** → 화면 위치 명확히 안내. 메뉴명 + 아이콘 모양 같이.
- **"안 들어가" / "안 떠"** → dev 서버 켜졌는지부터 확인 (`localhost:3002`)
- **dev 서버 띄우는 법**: VS Code 터미널 또는 Git Bash → `cd d:/browchart && npm run dev`
- **dev 서버 끄는 법**: 터미널에서 `Ctrl + C`
- **세션 끊겼을 때**: `taskkill //F //IM node.exe` 후 재시작

---

## 12. 만약 사용자가 새 작업 요청하면

먼저 이 파일의 **8번 (진행 중)** 확인 → 그 작업 마무리되었는지 사용자에게 확인 → 다음 단계로 진행.

새 세션이라면 보통 인사 + 어디까지 했는지 짧게 요약 + 다음 단계 제안.
