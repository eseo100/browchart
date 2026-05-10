import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-greige">
        <div className="flex items-baseline gap-3">
          <span className="font-display font-bold text-2xl tracking-tight text-deepbrown">
            BrowChart
          </span>
          <span className="text-[11px] font-light text-muted hidden sm:inline tracking-tight">
            반영구 시술자를 위한 고객관리
          </span>
        </div>
        <nav className="flex gap-1 text-sm">
          <Link
            href="/login"
            className="px-4 py-2 font-medium text-deepbrown hover:opacity-70"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg btn-primary text-sm font-semibold"
          >
            무료 시작
          </Link>
        </nav>
      </header>

      {/* 히어로 */}
      <section className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-3xl text-center space-y-8">
          <div className="inline-block px-3 py-1 bg-roselight text-deepbrown text-[11px] font-semibold rounded-full uppercase tracking-[0.15em]">
            Permanent Makeup SaaS
          </div>

          <h1 className="font-display font-bold text-5xl sm:text-6xl text-deepbrown leading-[1.1] tracking-tight">
            반영구 시술자가 만든,
            <br />
            <span className="font-light italic text-warmbrown">
              반영구를 위한 프로그램.
            </span>
          </h1>

          <p className="text-base sm:text-lg font-light text-muted leading-relaxed max-w-xl mx-auto">
            예약 · 상담차트 · 시안 · 동의서 · 리터치 알림까지.
            <br />
            <span className="font-medium text-deepbrown">눈썹문신 · 입술문신 · 속눈썹펌</span>
            {" "}시술자를 위한 올인원.
          </p>

          <div className="flex gap-3 justify-center pt-4">
            <Link
              href="/signup"
              className="px-7 py-3.5 rounded-xl btn-primary text-sm font-semibold tracking-tight"
            >
              14일 무료 시작
            </Link>
            <Link
              href="#features"
              className="px-7 py-3.5 rounded-xl border border-greige text-deepbrown text-sm font-semibold hover:bg-cream-light transition"
            >
              기능 살펴보기
            </Link>
          </div>
        </div>
      </section>

      {/* 7대 차별 기능 */}
      <section
        id="features"
        className="px-6 py-24 bg-cream-light border-t border-greige"
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-center font-display text-xs text-softpink uppercase tracking-[0.2em] font-semibold mb-4">
            Why BrowChart
          </p>
          <h2 className="text-center font-display font-bold text-3xl sm:text-4xl text-deepbrown mb-3 tracking-tight">
            반영구에만 집중한 9가지
          </h2>
          <p className="text-center text-sm font-light text-muted mb-14">
            통합형 SaaS가 못 가는 깊이까지.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="bg-nude rounded-2xl p-6 border border-greige hover:border-warmbrown transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display text-xs font-semibold text-muted tracking-widest">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xl">{f.icon}</span>
                </div>
                <h3 className="font-bold text-deepbrown mb-2 tracking-tight">
                  {f.title}
                </h3>
                <p className="text-sm font-light text-muted leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="px-6 py-10 border-t border-greige">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-display font-bold text-lg tracking-tight text-deepbrown">
            BrowChart
          </span>
          <span className="text-xs font-light text-muted tracking-tight">
            © 2026 BrowChart · 반영구 메이크업 전문 SaaS
          </span>
        </div>
      </footer>
    </main>
  );
}

const features = [
  {
    icon: "✏️",
    title: "시안 페이지",
    desc: "손님 얼굴 사진 위에 직접 디자인을 그려 상담하세요.",
  },
  {
    icon: "📷",
    title: "전후 비교",
    desc: "시술 전·후 사진을 슬라이더로 한눈에 비교.",
  },
  {
    icon: "📋",
    title: "부위별 차트",
    desc: "눈썹·입술·속눈썹 각각에 맞춘 시술 차트.",
  },
  {
    icon: "✍️",
    title: "모듈형 동의서",
    desc: "필요한 모듈만 켜서 한 번에 받는 전자서명 동의서.",
  },
  {
    icon: "🔔",
    title: "리터치 자동 알림",
    desc: "4~6주 후 손님에게 자동으로 리터치 안내 발송.",
  },
  {
    icon: "🎨",
    title: "디자인 라이브러리",
    desc: "눈썹 모양·컬러·기법을 손님별로 분류·기록.",
  },
  {
    icon: "📅",
    title: "예약 + 예약금",
    desc: "고객 예약 신청부터 입금 확인, 자동 안내까지.",
  },
  {
    icon: "🏪",
    title: "내 매장 브랜드",
    desc: "로고·컬러·문구를 직접 꾸며 손님에게 보여주세요.",
  },
  {
    icon: "💬",
    title: "자동 안내 문자",
    desc: "시술 전·후 관리 안내, 리뷰 요청까지 한 번에.",
  },
];
