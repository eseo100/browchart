# BrowChart 개발 인수인계 문서

> 마지막 업데이트: 2026-05-11
> 작성자: Mina + Claude (협업)
> 본 문서는 BrowChart SaaS의 모든 구성요소를 도면 수준으로 기록한 인수인계용 문서입니다.
> 새 개발자가 이 문서만 보고도 바로 작업을 이어갈 수 있도록 작성되었습니다.

---

## 📑 목차

0. [빠른 시작 (5분)](#0-빠른-시작)
1. [프로젝트 개요](#1-프로젝트-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [기술 스택](#3-기술-스택)
4. [폴더 구조](#4-폴더-구조)
5. [데이터베이스 스키마](#5-데이터베이스-스키마)
6. [페이지 / 라우트 전체 목록](#6-페이지--라우트-전체-목록)
7. [주요 컴포넌트](#7-주요-컴포넌트)
8. [인증 / 권한 시스템](#8-인증--권한-시스템)
9. [핵심 기능 흐름](#9-핵심-기능-흐름)
10. [외부 서비스 연동](#10-외부-서비스-연동)
11. [환경 변수](#11-환경-변수)
12. [배포 프로세스](#12-배포-프로세스)
13. [알려진 한계 / TODO](#13-알려진-한계--todo)
14. [보안 체크리스트](#14-보안-체크리스트)
15. [새 개발자 온보딩 가이드](#15-새-개발자-온보딩-가이드)

---

## 0. 빠른 시작

```bash
# 1. 코드 받기
git clone https://github.com/eseo100/browchart.git
cd browchart

# 2. 패키지 설치
npm install

# 3. 환경변수 파일 만들기
cp .env.local.example .env.local
# .env.local 안에 Supabase URL/Key 채우기 (관리자에게 받음)

# 4. 개발 서버 실행
npm run dev
# → http://localhost:3002 접속
```

**라이브**: https://browchart.vercel.app

**GitHub**: https://github.com/eseo100/browchart

**기본 dev 포트**: 3002 (package.json scripts에 정의)

---

## 1. 프로젝트 개요

### 무엇을 만드는가
**BrowChart**는 반영구 메이크업(눈썹문신/입술문신/속눈썹펌) 1인 매장 사장님들을 위한 **통합 운영 SaaS**입니다.

### 누구에게
- **타깃**: 반영구 메이크업 1인 매장 운영자 (시술자 = 사장님)
- **확장**: 향후 강의 수강생, 신규 시술자

### 수익 모델
- 월 구독료 **19,000원/매장** (단일 플랜)
- 14일 무료 체험
- VAT 별도

### 시장 포지셔닝
- 콜라보살롱(통합형)과 다른 **반영구 전용 깊이**
- iPad/Apple Pencil 우선 설계
- 차트 + 예약 + 동의서 + 사진 + 매출 통합

### 7대 차별 기능
1. 시안 페이지 (얼굴 사진 + 디자인 그리기) — 부분 구현
2. 시술 전·후 사진 비교 슬라이더 — ✅ 구현
3. 눈썹/입술/속눈썹 모양 라이브러리 — 부분 (칩 형태)
4. 부위별 차트 (각 시술 특화) — ✅ 구현
5. 모듈형 동의서 + 전자서명 — ✅ 구현
6. 리터치 자동 알림 — 부분 (날짜 자동, SMS 미연동)
7. 컬러/디자인 라이브러리 — 부분 (칩 형태)

---

## 2. 시스템 아키텍처

### 전체 구성도

```
[손님 브라우저/iPad]                  [원장 노트북/iPad]            [SaaS 운영자]
        │                                    │                            │
        ▼                                    ▼                            ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                        Next.js (Vercel CDN)                              │
  │                     https://browchart.vercel.app                         │
  │                                                                          │
  │  /booking/[slug]    /dashboard/*       /admin/*                         │
  │  (anon)             (authenticated)    (super_admin)                     │
  └─────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    Supabase (Northeast Asia · Seoul)                     │
  │                 Project ID: zyysbzdqsuwcufikrrsv                         │
  │                                                                          │
  │  PostgreSQL DB        Storage Bucket          Auth (email/pw)           │
  │  + RLS               'treatment-photos'       JWT-based                 │
  │  + Triggers          (private)                                          │
  │  + RPC Functions                                                        │
  └─────────────────────────────────────────────────────────────────────────┘
```

### 데이터 흐름

```
1. 손님 → /booking/[slug] (anon) → bookings INSERT (자동 customer 생성 트리거)
2. 원장 → /dashboard/bookings → bookings UPDATE (status 변경, deposit 토글)
3. 원장 → /dashboard/customers/[id] → customer 차트 작성 (UPDATE)
4. 원장 → 고객 모드 → 손님이 작성 → customer 차트 + consents INSERT
5. 원장 → 사진 업로드 → Storage + treatment_photos INSERT
6. 시술 완료 처리 → 통계 트리거 자동 실행 → customer.total_visits 증가
```

---

## 3. 기술 스택

| 분류 | 기술 | 버전 | 비고 |
|---|---|---|---|
| **Framework** | Next.js | 16.2.4 (Turbopack) | App Router 사용 |
| **UI Library** | React | 19.2.4 | Server Components 일부 사용 |
| **Styling** | Tailwind CSS | v4 | `@theme inline` 방식, CSS 변수 |
| **DB / Auth / Storage** | Supabase | `@supabase/supabase-js@^2.104.0` | RLS 적극 사용 |
| **TypeScript** | TS | strict | 모든 컴포넌트 타입 |
| **이미지/그림** | HTML5 Canvas + Pointer Events | - | Apple Pencil 인식 |
| **QR 코드** | api.qrserver.com (외부) | - | 가입/키 X, 무료 |
| **호스팅** | Vercel | - | GitHub auto-deploy |
| **문자 (예정)** | solapi | - | 매장별 키 입력형 결정됨 |

### 색상 팔레트 (CSS 변수, `globals.css`)

```css
--color-nude:        #FAF6F1;  /* 메인 배경 */
--color-cream-light: #F5EFE6;  /* 카드 배경 */
--color-warm-brown:  #6B4F3A;  /* 메인 강조 */
--color-deep-brown:  #3D2E20;  /* 진한 텍스트 */
--color-soft-pink:   #E8A598;  /* 포인트 */
--color-rose-light:  #F5D5CC;  /* 라이트 핑크 */
--color-greige:      #E5DDD0;  /* 보더 */
--color-muted:       #8B7768;  /* 서브 텍스트 */
```

Tailwind 클래스: `bg-nude`, `bg-cream-light`, `text-deepbrown`, `text-warmbrown`, `bg-softpink`, `bg-roselight`, `border-greige`, `text-muted`

### 폰트
- **본문 한글**: Pretendard Variable (jsdelivr CDN, `app/layout.tsx`에 link)
- **영문/숫자/제목**: Space Grotesk (next/font/google)
- 클래스: `font-display` (Space Grotesk)

---

## 4. 폴더 구조

```
d:\browchart\
├── CLAUDE.md                    # AI 작업용 컨텍스트 (현 프로젝트 컨텍스트)
├── HANDOVER.md                  # 본 문서
├── 회고-2026-05-10.md           # 2026-05-10 회고
├── 사업제안서-브로잉제이.html    # 사업 제안서 (PDF 변환용)
├── 사업제안서-브로잉제이.md      # 사업 제안서 마크다운 버전
│
├── package.json                 # dev 포트 3002, Next.js 16.2.4
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── .env.local                   # Supabase 키 (gitignore)
├── .env.local.example           # 환경변수 템플릿
├── .gitignore
│
├── sql/                         # 모든 DB 마이그레이션 (순서대로 실행됨)
│   ├── 01_auth_schema.sql              # salons, profiles, RLS
│   ├── 02_menus.sql                    # menus 테이블
│   ├── 03_bookings.sql                 # bookings + access_token
│   ├── 04_slot_blocking.sql            # booking_slots view, get_booking_by_token RPC
│   ├── 05_customers.sql                # customers + 자동등록/통계 트리거
│   ├── 06_chart_extras.sql             # 차트 확장 컬럼 (tags, drawing)
│   ├── 07_staff_pin.sql                # salons.staff_pin
│   ├── 08_business_hours.sql           # salons.open_hour, close_hour (단일)
│   ├── 09_consents.sql                 # consents 테이블
│   ├── 10_customer_drawings.sql        # customers.allergies_drawing, design_drawing
│   ├── 11_customer_numbers.sql         # customers.customer_number + 트리거
│   ├── 12_treatment_photos.sql         # treatment_photos + Storage 버킷
│   ├── 13_customer_tags.sql            # customers.tags
│   ├── 14_business_hours_v2.sql        # business_hours jsonb (요일별), closed_dates
│   └── 15_super_admin.sql              # is_super_admin() + super_admin RLS
│
├── lib/
│   ├── supabase.ts              # Supabase 클라이언트 (anon key)
│   ├── consent-templates.ts     # 동의서 템플릿 (눈썹/입술/속눈썹)
│   └── customer-grade.ts        # 고객 등급 계산 (신규/일반/단골/VIP)
│
└── app/
    ├── layout.tsx               # 루트 레이아웃 (Pretendard CDN, Space Grotesk)
    ├── globals.css              # CSS 변수, .btn-primary 등
    ├── manifest.ts              # PWA 매니페스트 (홈 화면 추가)
    ├── page.tsx                 # 랜딩 페이지
    │
    ├── login/
    │   └── page.tsx
    ├── signup/
    │   └── page.tsx
    │
    ├── booking/[slug]/
    │   ├── page.tsx                       # 손님 매장 페이지
    │   ├── my-bookings-modal.tsx          # 본인 예약 조회 모달
    │   ├── new/
    │   │   ├── page.tsx                   # 예약 신청 폼
    │   │   └── datetime-picker.tsx        # 달력+시간슬롯 (요일별 영업시간, 충돌체크)
    │   └── done/
    │       └── page.tsx                   # 예약 완료 (입금 안내)
    │
    ├── dashboard/                # 원장 영역 (AuthGuard 적용)
    │   ├── layout.tsx                     # AuthGuard 래핑
    │   ├── auth-guard.tsx                 # 인증 가드
    │   ├── page.tsx                       # 대시보드 홈 (통계 + 캘린더)
    │   ├── booking-link-box.tsx           # 손님 링크 박스 (URL + QR + 복사)
    │   ├── calendar-view.tsx              # 월 캘린더 + 시간 타임테이블
    │   │
    │   ├── menus/
    │   │   ├── page.tsx                   # 시술 메뉴 CRUD
    │   │   └── menu-form.tsx              # 메뉴 추가/수정 모달
    │   │
    │   ├── bookings/
    │   │   ├── page.tsx                   # 예약 관리 (상태 필터/액션)
    │   │   └── [id]/
    │   │       └── consent/
    │   │           ├── page.tsx           # (구) 동의서 작성 페이지
    │   │           └── signature-pad.tsx  # 서명 패드 컴포넌트
    │   │
    │   ├── customers/
    │   │   ├── page.tsx                   # 고객 목록 (검색/정렬, + 추가)
    │   │   └── [id]/
    │   │       ├── page.tsx               # 고객 차트 (상담/진단)
    │   │       ├── customer-mode.tsx      # 고객 모드 오버레이 (PIN 보호)
    │   │       ├── pin-setup-modal.tsx    # PIN 처음 설정
    │   │       ├── new-booking-modal.tsx  # 차트에서 다음 예약 잡기
    │   │       ├── drawing-canvas.tsx     # 진단 차트 펜 캔버스
    │   │       ├── photo-section.tsx      # 사진 업로드/갤러리/슬라이드
    │   │       └── compare-slider.tsx     # 전/후 비교 슬라이더
    │   │
    │   ├── consents/
    │   │   └── page.tsx                   # 동의서 모아보기 (전체 매장)
    │   │
    │   ├── sales/
    │   │   └── page.tsx                   # 매출 관리 (기간/메뉴/일별)
    │   │
    │   └── settings/
    │       └── page.tsx                   # 매장 설정 (정보/PIN/영업시간/휴무)
    │
    └── admin/                    # SaaS 운영자 영역 (AdminGuard)
        ├── layout.tsx                     # AdminGuard 래핑
        ├── admin-guard.tsx                # super_admin 권한 체크
        ├── page.tsx                       # SaaS 대시보드 (전체 통계)
        └── salons/
            └── page.tsx                   # 모든 매장 목록
```

---

## 5. 데이터베이스 스키마

### 5.1 테이블 목록 (실행 순서)

#### `salons` (sql/01)
매장 정보. 한 사장님(owner_id)이 여러 매장 가능 (다중 매장 지원 일부).

```sql
salons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,           -- /booking/{slug} URL용
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  brand jsonb DEFAULT '{}'::jsonb,     -- {tagline, intro 등 미래 확장}
  staff_pin text,                       -- 고객 모드 빠져나올 PIN (sql/07)
  open_hour integer DEFAULT 10,         -- 단일 영업시간 (legacy, sql/08)
  close_hour integer DEFAULT 19,        -- 단일 영업시간 (legacy)
  business_hours jsonb,                 -- 요일별 [{open, close, closed}, x7] (sql/14)
  closed_dates jsonb DEFAULT '[]',      -- 특정 날짜 휴무 (sql/14)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)
```

**RLS 정책**:
- `owners can view their own salon` (SELECT, owner)
- `owners can update their own salon` (UPDATE, owner)
- `owners can delete their own salon` (DELETE, owner)
- `authenticated users can insert salons` (INSERT)
- `public can view salon by slug` (SELECT, anon — slug 기반 조회용)
- `super admin can view all salons` (SELECT, super_admin)

#### `profiles` (sql/01)
유저 프로필. auth.users와 1:1.

```sql
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  salon_id uuid REFERENCES salons(id) ON DELETE SET NULL,
  name text,
  phone text,
  role text DEFAULT 'owner' CHECK (role IN ('super_admin', 'owner', 'manager', 'staff', 'viewer')),
  created_at timestamptz DEFAULT now()
)
```

**RLS**: 본인 프로필만 read/write. super_admin은 모두.

#### `menus` (sql/02)
시술 메뉴.

```sql
menus (
  id uuid PRIMARY KEY,
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  category text DEFAULT 'eyebrow' CHECK (
    category IN ('eyebrow', 'lip', 'eyelash', 'retouch', 'removal', 'other')
  ),
  name text NOT NULL,
  price integer DEFAULT 0,
  duration_minutes integer DEFAULT 60,
  deposit_amount integer DEFAULT 0,
  description text,
  precautions text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at, updated_at
)
```

**RLS**: owner는 본인 매장 메뉴 모두 가능. anon은 `is_active=true` SELECT만.

#### `bookings` (sql/03)
예약 정보.

```sql
bookings (
  id uuid PRIMARY KEY,
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  menu_id uuid REFERENCES menus(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  consultation jsonb DEFAULT '{}',         -- {experience, memo}
  desired_date date,
  desired_time time,
  customer_memo text,
  status text DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')
  ),
  deposit_amount integer DEFAULT 0,
  deposit_status text DEFAULT 'unpaid' CHECK (
    deposit_status IN ('unpaid', 'paid', 'refunded', 'waived')
  ),
  payment_method text DEFAULT 'bank_transfer' CHECK (
    payment_method IN ('bank_transfer', 'pg', 'onsite', 'waived')
  ),
  pg_payment_id text,                       -- 추후 PG 연동용 (현재 미사용)
  consent_signed boolean DEFAULT false,    -- legacy, 현재는 consents 테이블 사용
  consent_data jsonb,
  message_channel text DEFAULT 'sms' CHECK (
    message_channel IN ('sms', 'kakao_alimtalk', 'none')
  ),
  access_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at, updated_at
)
```

**RLS**:
- `owners can view their bookings` (SELECT, owner)
- `owners can update their bookings` (UPDATE, owner)
- `owners can delete their bookings` (DELETE, owner)
- `anyone can create bookings` (INSERT, anon + authenticated) — 인라인 변경
- `super admin can view all bookings` (SELECT, super_admin)

#### `customers` (sql/05, 06, 10, 11, 13)
고객 정보. 자동 생성됨 (예약 시 트리거).

```sql
customers (
  id uuid PRIMARY KEY,
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  customer_number integer,                  -- 매장별 #1, #2 (트리거 자동)
  phone text NOT NULL,
  name text,
  email text,
  birth_date date,
  
  -- 차트 정보 (원장 입력)
  skin_type text,
  allergies text,                            -- 자유 메모
  allergies_tags jsonb DEFAULT '[]',         -- 칩 다중선택
  allergies_drawing text,                    -- 펜 그림 base64 (sql/10)
  preferred_design text,                     -- 자유 메모
  design_tags jsonb DEFAULT '[]',
  design_drawing text,                       -- 펜 그림 base64 (sql/10)
  color_tags jsonb DEFAULT '[]',
  notes text,                                -- 진단 메모 (키보드)
  notes_drawing text,                        -- 진단 펜 그림 base64
  tags jsonb DEFAULT '[]',                   -- 자유 태그 (단골/신부 등) (sql/13)
  
  -- 통계 (트리거 자동 갱신)
  total_visits integer DEFAULT 0,
  last_visit_at timestamptz,
  next_retouch_date date,
  
  created_at, updated_at,
  UNIQUE (salon_id, phone)
)
```

**중요한 트리거** (sql/05):

```sql
-- 1) 예약 INSERT 시 customer 자동 upsert
booking_creates_customer (AFTER INSERT ON bookings)
  → upsert_customer_from_booking()
  → INSERT customers (salon_id, phone, name, email)
  → ON CONFLICT (salon_id, phone) DO UPDATE name/email
  → SECURITY DEFINER (RLS 우회)

-- 2) 예약 status가 'completed'로 바뀌면 통계 갱신
booking_completed_updates_stats (AFTER UPDATE ON bookings)
  → update_customer_stats_on_completion()
  → IF new.status = 'completed' AND old.status != 'completed':
    → customers.total_visits += 1
    → customers.last_visit_at = visit_date
    → customers.next_retouch_date = desired_date + 35 days
```

**고객번호 트리거** (sql/11):

```sql
customers_assign_number (BEFORE INSERT ON customers)
  → assign_customer_number()
  → IF customer_number IS NULL:
    → customer_number = max(customer_number) + 1 WHERE salon_id = new.salon_id
  → 매장별 #1, #2, #3...
```

**RLS**: owner는 본인 매장 고객 모두 가능. super_admin은 모두.

#### `consents` (sql/09)
전자 동의서 기록.

```sql
consents (
  id uuid PRIMARY KEY,
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  template_key text,                        -- 'eyebrow_default', 'lip_default', 'eyelash_default'
  title text NOT NULL,
  body jsonb DEFAULT '{}',                  -- {sections, agreements} 스냅샷
  agreements jsonb DEFAULT '[]',            -- 체크된 동의 항목들
  signature text NOT NULL,                  -- base64 PNG
  signed_name text NOT NULL,
  signed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
)
```

**RLS**: owner only. super_admin도 SELECT.

#### `treatment_photos` (sql/12)
시술 사진 메타데이터. 실제 파일은 Supabase Storage.

```sql
treatment_photos (
  id uuid PRIMARY KEY,
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  kind text DEFAULT 'progress' CHECK (kind IN ('before', 'after', 'progress')),
  storage_path text NOT NULL,               -- '{salon_id}/{customer_id}/{file}'
  notes text,
  taken_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
)
```

**Storage 버킷**: `treatment-photos` (private)

**Storage RLS** (sql/12):
- 경로 첫 폴더 = salon_id 매칭으로 owner 접근 제한
- INSERT, SELECT, DELETE 정책 모두 같은 패턴

### 5.2 Views

#### `booking_slots` (sql/04)
시간 충돌 체크용. 개인정보 X. anon에게 공개.

```sql
CREATE VIEW booking_slots AS
SELECT
  b.salon_id,
  b.desired_date,
  b.desired_time,
  b.status,
  COALESCE(m.duration_minutes, 60) as duration_minutes
FROM bookings b
LEFT JOIN menus m ON m.id = b.menu_id
WHERE b.status IN ('pending', 'confirmed');

GRANT SELECT ON booking_slots TO anon, authenticated;
```

### 5.3 RPC 함수

#### `get_booking_by_token(p_token text)` (sql/04)
손님이 본인 예약 한 건 조회 (완료 페이지에서 사용). access_token으로만 접근.

#### `get_bookings_by_phone(p_salon_slug text, p_phone text)` (sql/04, 인라인)
손님이 폰번호로 본인 예약 목록 조회 (매장 페이지 모달에서). 해당 매장 + 폰번호 일치한 예약만 반환.

#### `is_super_admin()` (sql/15)
RLS 정책에서 사용. 현재 사용자가 super_admin인지 확인.

```sql
CREATE FUNCTION is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  )
$$;
```

#### `upsert_customer_from_booking()` / `update_customer_stats_on_completion()` (sql/05)
트리거용 함수. 직접 호출 X.

#### `assign_customer_number()` (sql/11)
트리거용. 매장별 customer_number 자동 부여.

### 5.4 SQL 마이그레이션 실행 순서

신규 환경에 셋업할 때 **반드시 이 순서대로** 실행:

```
01_auth_schema.sql
02_menus.sql
03_bookings.sql
04_slot_blocking.sql
05_customers.sql
06_chart_extras.sql
07_staff_pin.sql
08_business_hours.sql
09_consents.sql
10_customer_drawings.sql
11_customer_numbers.sql
12_treatment_photos.sql
13_customer_tags.sql
14_business_hours_v2.sql
15_super_admin.sql
```

추가 인라인 변경:
- `bookings` INSERT 정책: `anon` 한정 → `anyone`으로 변경 (이유: 원장이 차트에서 직접 예약 추가 시)
- `get_bookings_by_phone` RPC 추가 (sql/04에 포함된 줄 알았는데 인라인으로 추가됨)

---

## 6. 페이지 / 라우트 전체 목록

### 6.1 손님 영역 (anon, 비로그인)

| 라우트 | 파일 | 설명 |
|---|---|---|
| `/` | `app/page.tsx` | 랜딩 페이지 (히어로 + 9개 기능 카드) |
| `/login` | `app/login/page.tsx` | 로그인 |
| `/signup` | `app/signup/page.tsx` | 회원가입 (이메일/비번/매장명/slug) |
| `/booking/[slug]` | `app/booking/[slug]/page.tsx` | 매장 메뉴 목록 + 본인 예약 조회 모달 |
| `/booking/[slug]/new?menu=xxx` | `app/booking/[slug]/new/page.tsx` | 예약 신청 폼 |
| `/booking/[slug]/done?token=xxx` | `app/booking/[slug]/done/page.tsx` | 예약 완료 (입금 안내) |

### 6.2 원장 영역 (authenticated, AuthGuard)

| 라우트 | 파일 | 설명 |
|---|---|---|
| `/dashboard` | `app/dashboard/page.tsx` | 대시보드 홈 (실시간 통계 + 월 캘린더 + 타임테이블) |
| `/dashboard/menus` | `app/dashboard/menus/page.tsx` | 시술 메뉴 CRUD |
| `/dashboard/bookings` | `app/dashboard/bookings/page.tsx` | 예약 관리 (상태 필터, 액션 버튼) |
| `/dashboard/bookings/[id]/consent` | `app/dashboard/bookings/[id]/consent/page.tsx` | (구) 동의서 작성 페이지. 이제 고객 모드에서 처리. |
| `/dashboard/customers` | `app/dashboard/customers/page.tsx` | 고객 목록 + 직접 추가 |
| `/dashboard/customers/[id]` | `app/dashboard/customers/[id]/page.tsx` | 고객 차트 (상담/진단/사진/타임라인) |
| `/dashboard/consents` | `app/dashboard/consents/page.tsx` | 모든 동의서 모아보기 |
| `/dashboard/sales` | `app/dashboard/sales/page.tsx` | 매출 관리 (기간/메뉴/일별/카테고리) |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | 매장 설정 (정보/PIN/영업시간/휴무) |

### 6.3 SaaS 운영자 영역 (super_admin only, AdminGuard)

| 라우트 | 파일 | 설명 |
|---|---|---|
| `/admin` | `app/admin/page.tsx` | SaaS 통합 대시보드 (전체 통계) |
| `/admin/salons` | `app/admin/salons/page.tsx` | 모든 매장 목록 (활성도/매출) |

---

## 7. 주요 컴포넌트

### 7.1 공용 컴포넌트

#### `app/dashboard/auth-guard.tsx`
인증 체크. 미로그인 시 `/login`으로 리다이렉트.
- 사용처: `app/dashboard/layout.tsx`

#### `app/admin/admin-guard.tsx`
super_admin 권한 체크. 일반 owner는 차단.
- 사용처: `app/admin/layout.tsx`

#### `app/dashboard/booking-link-box.tsx`
손님 예약 URL + 복사 버튼 + QR 코드.
- props: `slug`, `variant: 'compact' | 'card'`
- QR 생성: `api.qrserver.com` 외부 API

#### `app/dashboard/calendar-view.tsx`
월 캘린더 + 시간대별 타임테이블 (요일 영업시간 인식, 휴무일 표시).
- props: `salonId`, `businessHours`, `closedDates`
- 30분 슬롯 단위, 예약 블록 클릭 → 고객 차트로 이동

### 7.2 고객 차트 관련

#### `app/dashboard/customers/[id]/customer-mode.tsx`
고객 모드 전체화면 오버레이. PIN 입력해야 종료. **백버튼/스와이프 백 차단**.
- 손님이 작성: 피부타입 / 알러지 / 디자인 / 컬러 / 동의서
- 펜 그림 영역: 알러지·디자인 (`SignaturePad` 재사용)
- 백버튼 보호: `pushState` + `popstate` 이벤트로 PIN 모달 강제

#### `app/dashboard/customers/[id]/pin-setup-modal.tsx`
PIN 처음 설정 모달. 첫 고객 모드 시 자동 노출.

#### `app/dashboard/customers/[id]/new-booking-modal.tsx`
차트에서 다음 예약 직접 추가.

#### `app/dashboard/customers/[id]/drawing-canvas.tsx`
진단 차트 펜 캔버스. 다양한 색상/굵기/지우개 지원.
- Apple Pencil 인식 (Pointer Events)
- 결과: base64 PNG → `notes_drawing`

#### `app/dashboard/customers/[id]/photo-section.tsx`
사진 업로드/갤러리/슬라이드/비교 섹션.
- 업로드 3가지 (시술 전/진행 중/시술 후)
- 갤러리: 종류별 그리드
- 모달: 큰 보기 + 좌우 화살표 + 키보드 + 스와이프
- 비교 슬라이더 트리거

#### `app/dashboard/customers/[id]/compare-slider.tsx`
시술 전·후 비교 슬라이더. 가운데 핸들 드래그로 좌우 비교.

### 7.3 동의서 관련

#### `app/dashboard/bookings/[id]/consent/signature-pad.tsx`
서명 패드 캔버스. props: `value`, `onChange`, `placeholder`, `clearLabel`
- `customer-mode.tsx`에서도 재사용 (펜 그림 용도)

### 7.4 예약 관련

#### `app/booking/[slug]/new/datetime-picker.tsx`
달력 + 시간 슬롯 선택기.
- 요일별 영업시간 인식
- 특정 날짜 휴무 인식
- 시간 충돌 자동 차단 (`booking_slots` view 조회)
- 시술 시간 시각화 (warmbrown 시작 + roselight 진행중)

#### `app/booking/[slug]/my-bookings-modal.tsx`
손님 본인 예약 조회 모달. 폰번호 입력 → `get_bookings_by_phone` RPC.

---

## 8. 인증 / 권한 시스템

### 8.1 사용자 타입

```
auth.users (Supabase Auth)
  ↓ 1:1
profiles (role 컬럼)
  ├── 'super_admin'   → /admin/* 접근 가능 (Mina)
  ├── 'owner'         → /dashboard/* 접근 (매장 사장님, 기본)
  ├── 'manager'       → 사용 안 함 (미래)
  ├── 'staff'         → 사용 안 함 (미래)
  └── 'viewer'        → 사용 안 함 (미래)
```

### 8.2 가드 흐름

```
요청 → /dashboard/*
  ↓
AuthGuard
  ├── 로그인 X → /login 리다이렉트
  └── 로그인 O → 통과

요청 → /admin/*
  ↓
AdminGuard
  ├── 로그인 X → /login 리다이렉트
  ├── role !== 'super_admin' → "권한 없음" 화면 + /dashboard 안내
  └── 통과

손님 (anon) → /booking/[slug] 직접 접근 가능
```

### 8.3 PIN 시스템 (직원 PIN)

별도 인증 레이어. 매장 직원/원장이 알고 있는 PIN.

- **목적**: 고객 모드에서 손님이 다른 화면 못 보게
- **저장**: `salons.staff_pin` (4~6자리 평문)
- **사용처**:
  - 고객 모드 빠져나올 때
  - 백버튼/스와이프 백 차단 시
  - (선택) slug 변경 시 비밀번호 재확인 (현재는 계정 비번)

### 8.4 매장 정보 변경 (높은 권한)

slug나 매장명 변경 시:
- **계정 비밀번호** 재입력 (PIN 아님)
- `supabase.auth.signInWithPassword` 호출로 검증
- 매장 브랜드 변경은 원장만 가능하게

---

## 9. 핵심 기능 흐름

### 9.1 손님 예약 신청 (전체 흐름)

```
[손님 시점]
1. 카톡/명함/QR로 받은 링크 클릭 → /booking/[slug]
2. 메뉴 카테고리별 보기 → 메뉴 선택 → "예약하기"
3. /booking/[slug]/new?menu={id}
4. 폼 입력:
   - 손님 정보 (이름/전화/이메일)
   - 시술 경험 (3택1)
   - 상담 메모 (선택)
   - 달력에서 날짜 선택 (휴무일 회색 차단)
   - 시간 슬롯 (요일별 영업시간 + 충돌 자동 차단)
   - 동의 체크박스
5. "예약 신청하기" → 클라이언트에서 access_token 생성 → bookings INSERT
6. (자동 트리거) booking_creates_customer → customers 자동 upsert
7. /booking/[slug]/done?token={access_token}
8. get_booking_by_token RPC로 본인 예약 조회 → 입금 안내 표시

[원장 시점]
9. /dashboard/bookings 진입 → 새 예약 (대기) 카드 펼침
10. "✓ 예약 확정" 클릭 → status: pending → confirmed
11. 손님 입금 후 "💰 입금 확인" 토글
12. 시술 당일 손님 도착 → 차트로 (다음 단계 9.2)

[손님이 본인 예약 조회]
13. /booking/[slug] → 우측 상단 "📋 내 예약 조회" 클릭
14. 폰번호 입력 → get_bookings_by_phone RPC
15. 본인 예약만 표시 (다른 사람 정보 X)
```

### 9.2 시술 당일 (고객 모드 흐름)

```
1. 원장이 /dashboard/customers/[id] 진입
2. 헤더에서 "💁 고객 모드" 클릭
   - PIN 미설정 시 → PIN 설정 모달 자동 노출 → 설정 완료 후 진입
   - PIN 설정 시 → 즉시 진입
3. 전체화면 오버레이 (본 페이지 아래 깔림, 안 보임)
4. iPad 손님에게 전달 → 손님이 직접 작성:
   - 1. 피부 타입 (큰 버튼)
   - 2. 알러지/특이사항 (칩 + 펜 그림)
   - 3. 원하는 디자인 (눈썹/입술/속눈썹 그룹별 칩 + 펜)
   - 4. 원하는 컬러 (눈썹/입술 칩)
   - 5. 시술 동의서 (활성 예약 있을 때만 노출)
5. 손님이 백버튼/스와이프 시도 → 자동 PIN 모달
6. "✓ 다 적었어요 (직원 호출)" 클릭
7. 데이터 자동 저장:
   - customers.skin_type, allergies_tags, design_tags, color_tags 등
   - allergies_drawing, design_drawing (base64)
   - consents 테이블에 INSERT (서명 + 동의 항목)
8. 직원 PIN 입력 → 정상 차트로 복귀
9. 차트에서 손님 입력 결과 자동 반영됨
10. 원장: 진단 차트 작성 (notes + 펜 시안) → 시술
11. 시술 후 사진 업로드 → "✓ 시술 완료" 처리
12. (자동 트리거) total_visits +1, last_visit_at, next_retouch_date 갱신
```

### 9.3 사진 업로드 + 비교

```
1. /dashboard/customers/[id] → 📷 시술 전/후 사진 섹션
2. 업로드 버튼 (시술 전/진행 중/시술 후) 클릭
3. iOS 네이티브 picker → 카메라 또는 사진 보관함 선택
4. 파일 선택 → handleUpload:
   - photoId = crypto.randomUUID()
   - path = `{salon_id}/{customer_id}/{photoId}.{ext}`
   - Storage upload → bucket: 'treatment-photos'
   - treatment_photos INSERT
5. 갤러리에 종류별 그룹으로 표시
6. 사진 클릭 → 큰 보기 모달
   - 좌우 화살표 / 키보드 / 스와이프 (touch events)
   - 카운터 (3 / 12)
   - 삭제 버튼
7. "🔀 전/후 비교 보기" → CompareSlider 모달
   - 첫 번째 before/after 자동 페어
   - 가운데 핸들 좌우 드래그 → 비교
   - 썸네일에서 다른 페어로 변경 가능
```

### 9.4 동의서

```
- 자동 템플릿: 메뉴 카테고리(eyebrow/lip/eyelash) → consent-templates.ts에서 매칭
- 작성 시점: 고객 모드 안에서 (활성 예약 있을 때 자동 노출)
- 저장: consents 테이블 + 서명 PNG base64
- 보기: /dashboard/consents (전체) 또는 고객 차트의 시술 타임라인 안 펼치기
```

### 9.5 매출 분석

```
- /dashboard/sales
- 기간 필터: 이번 달 / 지난 달 / 올해 / 전체
- 데이터: bookings WHERE status='completed' AND desired_date IN range
- 메트릭:
  - 총 매출 = sum(menu.price)
  - 시술 건수 = count
  - 평균 객단가 = total / count
- 메뉴별 / 카테고리별 / 일별 시각화 (CSS bar chart)
- 미수금: bookings WHERE status='confirmed' AND deposit_status='unpaid'
```

### 9.6 SaaS 관리자 (Mina)

```
- /admin (super_admin only)
- 통계: 매장수, 고객수, 예약수, 동의서수, 오늘 예약, 확인 대기
- /admin/salons: 모든 매장 목록 + 활성도 (마지막 예약 14일 이내)
- 검색: 매장명/slug/운영자명
- 일반 대시보드 헤더에 "⚙ ADMIN" 뱃지 표시 (super_admin만)
```

---

## 10. 외부 서비스 연동

### 10.1 현재 사용 중

#### Supabase
- **프로젝트 ID**: `zyysbzdqsuwcufikrrsv`
- **Region**: Northeast Asia (Seoul)
- **URL**: `https://zyysbzdqsuwcufikrrsv.supabase.co`
- **이메일 confirmation**: OFF (개발용)
- **Anon Key**: `.env.local`에 저장
- **사용 기능**: Auth, Database (Postgres + RLS), Storage

#### Vercel
- **프로젝트**: browchart
- **Domain**: https://browchart.vercel.app
- **Auto-deploy**: GitHub main 브랜치 push 시 자동
- **Env vars**: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

#### api.qrserver.com
- QR 코드 이미지 생성 (외부 무료 API)
- 가입/키 X
- URL 패턴: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data={url}`

#### GitHub
- **Repo**: https://github.com/eseo100/browchart (private)
- main 브랜치만 사용

### 10.2 결정됐지만 미연동

#### Solapi (SMS) — B안 결정
**미구현**. 매장별 키 입력형으로 결정됨.

매장 사장님이 직접:
1. 솔라피 가입 (사업자번호 필요)
2. 발신번호 인증 (1~3일)
3. 충전 (선불, ~9-13원/SMS)
4. BrowChart 매장 설정에 API Key/Secret/발신번호 입력

미래 구현 시 필요한 것:
- 매장 설정 페이지에 솔라피 키 입력 UI
- Edge Function 또는 API Route에서 솔라피 API 호출
- 발송 트리거 (예약 접수/확정/리터치 등)

**또는 A안 (BrowChart 통합 채널)으로 변경 검토 중**:
- 콜라보살롱 방식
- 미나님이 카카오 비즈채널 + 솔라피 본인 명의로 개설
- 표준 알림톡 템플릿 미리 심사
- 사장님 가입 X, 토글로 켜기

#### 카카오 비즈채널 알림톡
SMS와 함께 검토 중. 6원/건으로 SMS보다 저렴.

### 10.3 검토 중 (미정)

- **PG 결제** (포트원 / 토스페이먼츠) — 자동 입금 확인용
- **AI 디자인 추천** — 베타 후 결정
- **인스타 반자동 공유** — 베타 후

---

## 11. 환경 변수

### 11.1 `.env.local`

```
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://zyysbzdqsuwcufikrrsv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...  # 긴 JWT

# Solapi (미사용, 미래)
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SOLAPI_PFID=
SOLAPI_FROM=
```

### 11.2 Vercel 환경변수

배포 시 Vercel Dashboard → Settings → Environment Variables에 동일하게 설정.
- `NEXT_PUBLIC_*` 접두사가 있어야 클라이언트에서 접근 가능

---

## 12. 배포 프로세스

### 12.1 일반 작업 흐름

```bash
# 1. 코드 수정 (로컬에서 npm run dev로 미리보기)
# localhost:3002

# 2. 변경사항 확인
git status
git diff

# 3. 커밋
git add .
git commit -m "기능 설명"

# 4. push (자동 배포)
git push

# 5. Vercel 1~2분 빌드 → browchart.vercel.app 자동 반영
```

### 12.2 SQL 마이그레이션 (DB 스키마 변경)

```
1. sql/ 디렉토리에 새 .sql 파일 생성 (이름: NN_설명.sql, 다음 번호)
2. Supabase Dashboard → SQL Editor → 새 query
3. .sql 파일 내용 붙여넣기 → Run
4. "Success" 확인
5. 로컬에서 테스트
6. git commit + push
```

### 12.3 Storage 버킷

신규 환경에서 셋업 시 sql/12 실행으로 자동 생성됨.
- 버킷명: `treatment-photos`
- Public: false
- RLS: 경로 첫 폴더 = salon_id 매칭

### 12.4 새 환경 셋업 (다른 개발자가 처음 돌릴 때)

```bash
# 1. Repo clone
git clone https://github.com/eseo100/browchart.git
cd browchart

# 2. 의존성 설치
npm install

# 3. Supabase 프로젝트 만들기 (또는 기존 거 사용)
# 3-1. supabase.com 가입 → New Project
# 3-2. SQL Editor에서 sql/01 ~ sql/15 순서대로 실행
# 3-3. 본인 이메일을 super_admin으로 등록 (sql/15 안에 UPDATE 문 수정)

# 4. .env.local 만들기
cp .env.local.example .env.local
# Supabase Dashboard → API → URL과 anon key 복사

# 5. 개발 서버 실행
npm run dev

# 6. 회원가입 → 매장 만들기 → 테스트
```

---

## 13. 알려진 한계 / TODO

### 13.1 기능 완성도

| 기능 | 상태 | 비고 |
|---|---|---|
| 회원가입 / 로그인 | ✅ 완성 | 비밀번호 확인 포함 |
| 매장 생성 / 정보 수정 | ✅ 완성 | 비밀번호 검증 |
| 시술 메뉴 CRUD | ✅ 완성 | 6개 카테고리 |
| 손님 예약 (달력 + 시간 슬롯) | ✅ 완성 | 시간 충돌 자동 차단 |
| 요일별 영업시간 | ✅ 완성 | 휴무일 포함 |
| 예약 관리 (확정/취소/완료) | ✅ 완성 | 입금 확인 토글 |
| 손님 본인 예약 조회 | ✅ 완성 | 폰번호 RPC |
| 고객 차트 (상담/진단) | ✅ 완성 | 칩 + 펜 시안 |
| 고객 모드 + PIN | ✅ 완성 | 백버튼 보호 |
| 동의서 (전자서명) | ✅ 완성 | 카테고리별 템플릿 |
| 사진 업로드/갤러리/비교 | ✅ 완성 | Storage 사용 |
| 매장 설정 페이지 | ✅ 완성 | PIN/영업시간/매장 정보 |
| 매출 관리 | ✅ 완성 | 기간/메뉴/일별 |
| SaaS Admin 대시보드 | ✅ 완성 | super_admin |
| Vercel 배포 | ✅ 완성 | auto-deploy |
| **SMS 알림 (solapi)** | ❌ 미구현 | B안 결정, 코드 X |
| **카카오 알림톡** | ❌ 미구현 | A/B안 검토 중 |
| **PG 결제** | ❌ 미구현 | 계좌입금 수동 확인 중 |
| **다중 매장** | ⏳ 부분 | DB는 지원, UI는 1매장만 |
| **시그니처 디자인 라이브러리** | ❌ 미구현 | 베타 후 결정 |
| **AI 디자인 추천** | ❌ 미구현 | 비용·복잡도 검토 |
| **인스타 반자동 공유** | ❌ 미구현 | API 한계로 반자동 |
| **동의서 PDF 다운로드** | ❌ 미구현 | 한글 폰트 임베딩 필요 |
| **PWA 아이콘** | ⏳ 매니페스트만 | 192/512 PNG 필요 |
| **한글 분석 (초성 검색)** | ❌ | 일반 includes 매칭만 |
| **벌크 액션** | ❌ | 예약 다중 처리 |

### 13.2 코드 품질

- **테스트**: 없음 (단위/E2E)
- **에러 모니터링**: 없음 (Sentry 권장)
- **Analytics**: 없음 (GA4/Mixpanel 권장)
- **CI/CD**: 수동 (Vercel auto-deploy 외엔 X)
- **타입 안전성**: 일부 `as unknown as` 캐스트 있음
- **컴포넌트 라이브러리**: 자체 styling, 재사용 컴포넌트 적음
- **i18n**: 한국어 하드코딩

### 13.3 보안

- ✅ RLS 적극 사용 (모든 테이블)
- ✅ Storage 경로 기반 권한
- ✅ `is_super_admin()` 함수 + RLS
- ✅ access_token 16바이트 unguessable
- ⚠️ PIN 평문 저장 (4~6자리, 위험 낮음)
- ⚠️ 펜 그림 base64로 DB 저장 (큰 데이터; Storage 이전 권장)

### 13.4 UX

- ❌ 로딩 스피너 (텍스트만)
- ❌ 일관된 에러 토스트 (alert + 빨간 글씨)
- ❌ 다크모드
- ❌ 모바일 폰 화면 일부 어색 (iPad 우선)
- ❌ 접근성 (aria-label 부족)

---

## 14. 보안 체크리스트

### 14.1 RLS 검증

새 테이블 만들 때 반드시:
1. `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
2. owner SELECT/INSERT/UPDATE/DELETE 정책
3. (필요 시) anon SELECT 정책 (제한적으로)
4. (선택) super_admin SELECT 정책

### 14.2 Storage 권한

새 버킷 만들 때:
1. `INSERT INTO storage.buckets (id, name, public) VALUES (..., false);`
2. INSERT/SELECT/DELETE 정책 (path 기반)
3. 경로 컨벤션: `{salon_id}/{관련_id}/{파일}`

### 14.3 환경변수

- `.env.local` **절대 git commit X** (gitignore 됨)
- Vercel에 별도 입력
- `NEXT_PUBLIC_*` 만 클라이언트 노출 (anon key는 OK, service role key는 절대 X)

### 14.4 비밀번호

- Supabase Auth가 처리 (bcrypt)
- 우리 코드에선 평문 다루지 않음
- 매장 정보 변경 시 `signInWithPassword`로 재검증

### 14.5 PIN

- 매장당 1개 (salons.staff_pin)
- 평문 저장 (4~6자리, 위험 낮음)
- 해시 권장 (bcrypt 등) — TODO

---

## 15. 새 개발자 온보딩 가이드

### 15.1 첫 1시간

1. 본 문서 (HANDOVER.md) 읽기
2. CLAUDE.md 읽기 (사용자 컨텍스트)
3. `회고-2026-05-10.md` 읽기 (진척 + 의도)
4. 라이브 사이트 둘러보기 (`browchart.vercel.app`)
5. GitHub repo 클론 + npm install
6. `.env.local` 받아서 채우기
7. `npm run dev` → localhost:3002 접속

### 15.2 첫 1일

1. Supabase Dashboard 접근권한 받기
2. 모든 SQL 마이그레이션 파일(sql/01~15) 한 번씩 읽기
3. 핵심 페이지 코드 읽기:
   - `app/booking/[slug]/page.tsx` (손님 진입점)
   - `app/dashboard/page.tsx` (대시보드)
   - `app/dashboard/customers/[id]/page.tsx` (가장 복잡)
4. 손님 → 예약 → 원장 확정 → 시술 완료 → 매출 반영 한 사이클 직접 돌려보기

### 15.3 첫 1주

1. 작은 버그 1~2개 수정해보기 (감 잡기)
2. 새 SQL 마이그레이션 + 새 페이지 1개 만들어보기
3. Vercel 배포 한 번 직접 (git push만)
4. 미나님과 30분 미팅: 비전/우선순위 동기화

### 15.4 자주 보는 곳

- **Supabase Dashboard** → Table Editor (DB 직접 확인)
- **Supabase SQL Editor** → 쿼리 / 마이그레이션
- **Vercel Dashboard** → Deployments / Logs
- **GitHub** → Issues / PRs

### 15.5 자주 쓰는 명령

```bash
# 개발
npm run dev           # localhost:3002
npm run build         # 빌드 테스트
npm run lint          # ESLint

# Git
git status
git add . && git commit -m "..." && git push

# Windows에서 dev 서버 끄기 (안 꺼질 때)
taskkill //F //IM node.exe
```

### 15.6 핵심 컨벤션

- 한국어 UI 텍스트
- Tailwind CSS 우선, 인라인 스타일 최소
- 색상은 CSS 변수(theme inline)로 통일
- 컴포넌트 분리는 필요할 때만 (premature abstraction X)
- 트리거/RPC는 SECURITY DEFINER로 RLS 우회 (조심)
- 사용자 데이터는 `customers` 테이블 unique = (salon_id, phone)
- 시간은 KST 기준 (서버는 UTC지만 표시는 한국)

### 15.7 주의사항

- **CLAUDE.md** 와 본 문서를 항상 최신 상태로 유지 (큰 변경 시)
- 새 SQL 마이그레이션은 sql/ 디렉토리에 NN_설명.sql 형식으로
- bookings, customers, consents 테이블 삭제·수정 시 트리거 영향 확인
- access_token 변경 시 종전 손님 링크 깨질 수 있음
- slug 변경 시 종전 공유 링크 깨짐 (비밀번호 재인증 추가됨)

---

## 부록 A: 자주 발생하는 문제 + 해결법

### A.1 "Failed to execute 'fetch' on 'Window': Invalid value"
- 환경변수에 공백/줄바꿈 들어감
- Vercel Settings → Environment Variables 다시 입력 → Redeploy

### A.2 회원가입 후 매장 생성 안 됨
- profiles INSERT 정책 확인
- auth.users.confirm 필요 여부 (현재 OFF)

### A.3 PWA 홈 화면 추가 후 시작 페이지 다름
- `app/manifest.ts`의 `start_url` 확인 (현재 `/dashboard`)

### A.4 손님이 예약 신청 시 "권한 없음"
- bookings INSERT 정책 확인 (현재 `anyone can create bookings`)
- 인라인 SQL로 `to anon` → `to public`(또는 빠짐) 변경 필요

### A.5 Storage 업로드 실패
- 경로 첫 폴더가 salon_id인지 확인
- 버킷이 'treatment-photos' 인지

---

## 부록 B: 향후 확장 아이디어

1. **카카오 알림톡 통합 발송** (A안 — BrowChart 채널)
2. **다중 매장 UI** (대시보드에 매장 전환 버튼)
3. **요일별 다중 시간대** (오전/오후 분리)
4. **예약금 PG 결제** (포트원/토스)
5. **AI 디자인 추천** (OpenAI API + Stable Diffusion)
6. **인스타 반자동 공유** (Web Share API)
7. **동의서 PDF 다운로드** (한글 폰트 임베딩)
8. **벌크 액션** (예약 다중 처리)
9. **고객 LTV 분석** (재방문율, 추천 효과)
10. **매장별 솔라피 키 입력 (B안)**

---

## 부록 C: 비즈니스 컨텍스트

### 사용자 (장미나, "미나님")
- 미용사 + 향후 반영구 메이크업 시술자
- 비기술자 (코드 X)
- 한국어 대화
- VS Code + Git Bash 사용
- iPad + Apple Pencil 보유 (테스트 환경)

### 협업 파트너 (예정)
- **브로잉제이 원장**: 강사 + 시술자, 첫 베타 파트너
- 1차 미팅 → 1개월 베타 → 2차 미팅 → 정식 계약 흐름
- 수익 분배 30% (그 사람이 데려온 매장)
- 사업제안서: `사업제안서-브로잉제이.html`

### 가격 정책
- 단일 플랜 19,000원/월 (콜라보살롱과 동가)
- 14일 무료 체험
- VAT 별도

### 출시 시점 (목표)
- 2026-06: 베타 시작 (브로잉제이)
- 2026-07: 정식 출시
- 2026-12: 첫 50매장
- 2027-상반기: 100매장 + SMS/알림톡

---

## 마지막으로

**이 문서를 받은 새 개발자에게**:

미나님은 비기술자입니다. 한국어로 친절하게, 단계적으로, 단순하게 설명해주세요.
"한 번에 너무 많은 옵션 주지 않기, 핵심만 짧게, 화면 상태 자주 확인" 이 원칙을 지켜주시면 협업이 잘 됩니다.

코드보다 사용자(매장 사장님)의 실제 운영 흐름을 우선 생각해주세요.
"이거 매장에서 손님 앞에서 누를 만한 버튼인가?", "iPad에서 펜으로 잘 그려지는가?" 같은 관점이 가장 중요합니다.

**연락처**: jangmina7@naver.com (미나님)
**Repo**: https://github.com/eseo100/browchart
**Live**: https://browchart.vercel.app

수고하세요! 🌸
