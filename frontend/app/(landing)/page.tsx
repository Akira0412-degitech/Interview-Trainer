import Link from "next/link";

// ---------------------------------------------------------------------------
// Feature card
// ---------------------------------------------------------------------------
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[#1e1e1e] border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
      <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-1">{title}</h3>
        <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat pill
// ---------------------------------------------------------------------------
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-3xl font-bold text-white">{value}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interviewer card
// ---------------------------------------------------------------------------
function InterviewerCard({
  name,
  role,
  description,
  badge,
  badgeColor,
  avatarColor,
  initial,
}: {
  name: string;
  role: string;
  description: string;
  badge: string;
  badgeColor: string;
  avatarColor: string;
  initial: string;
}) {
  return (
    <div className="bg-[#1e1e1e] border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-sm font-bold`}>
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-100">{name}</span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}>
              {badge}
            </span>
          </div>
          <span className="text-xs text-zinc-500">{role}</span>
        </div>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-zinc-100 font-sans flex flex-col">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#1a1a1a]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-orange-500 font-bold text-lg tracking-tight">CodePrep</span>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-orange-500 hover:bg-orange-400 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden pt-24 pb-20 px-6">
          {/* Glow */}
          <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-orange-500/10 blur-[120px]" />

          <div className="relative max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              AI-powered mock interviews
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white leading-tight mb-6">
              Ace your next{" "}
              <span className="text-orange-500">coding interview</span>
            </h1>

            <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-10">
              Practice with realistic AI interviewers, get instant feedback on
              your code and communication, and track your improvement over time.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors shadow-lg shadow-orange-500/20"
              >
                Start practicing for free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm px-6 py-3 rounded-xl transition-colors border border-zinc-700"
              >
                I have an account
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="border-y border-zinc-800 py-12 px-6">
          <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8 text-center divide-x divide-zinc-800">
            <Stat value="50+" label="Curated problems" />
            <Stat value="3" label="AI interviewer styles" />
            <Stat value="5" label="Performance categories" />
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-3">
                Everything you need to prepare
              </h2>
              <p className="text-zinc-500 text-sm max-w-xl mx-auto">
                A complete interview simulation environment built to mirror
                real-world technical interviews.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FeatureCard
                title="Live coding environment"
                description="Write and run code in a full editor with syntax highlighting and real-time execution against test cases."
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                }
              />
              <FeatureCard
                title="AI voice interviewer"
                description="Talk through your approach with an AI interviewer who asks follow-up questions and responds naturally."
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                }
              />
              <FeatureCard
                title="Instant AI feedback"
                description="Receive detailed feedback on code quality, algorithm efficiency, communication, and edge-case handling."
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                }
              />
              <FeatureCard
                title="Multiple difficulty levels"
                description="Practice Easy, Medium, and Hard problems across Arrays, Trees, Strings, and Dynamic Programming."
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                }
              />
              <FeatureCard
                title="Performance dashboard"
                description="Track every session you've completed, review past feedback, and see your scores improve over time."
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                  </svg>
                }
              />
              <FeatureCard
                title="Interview transcript"
                description="Review the full conversation after every session so you can learn exactly where you can improve."
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                }
              />
            </div>
          </div>
        </section>

        {/* ── Interviewers ── */}
        <section className="py-20 px-6 bg-[#161616] border-y border-zinc-800">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-3">
                Choose your interviewer
              </h2>
              <p className="text-zinc-500 text-sm max-w-lg mx-auto">
                Each AI interviewer has a distinct style to match your
                preparation goals.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InterviewerCard
                name="Alex"
                role="Junior Engineer"
                description="Friendly and encouraging. Happy to give hints and guide you through the problem step by step."
                badge="Easy"
                badgeColor="text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
                avatarColor="bg-emerald-500/10 text-emerald-400"
                initial="A"
              />
              <InterviewerCard
                name="Jordan"
                role="Senior Engineer"
                description="Balanced and professional. Standard interview pace with occasional nudges when you're stuck."
                badge="Mid"
                badgeColor="text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
                avatarColor="bg-yellow-500/10 text-yellow-400"
                initial="J"
              />
              <InterviewerCard
                name="Morgan"
                role="Staff Engineer"
                description="Strict and demanding. No hints. Expects optimal solutions and challenges every decision you make."
                badge="Hard"
                badgeColor="text-red-400 bg-red-400/10 border-red-400/30"
                avatarColor="bg-red-500/10 text-red-400"
                initial="M"
              />
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to start practicing?
            </h2>
            <p className="text-zinc-500 text-base mb-8">
              Create a free account and complete your first mock interview in
              under 5 minutes.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-orange-500/20"
            >
              Create free account
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="mt-4 text-xs text-zinc-600">
              Already have an account?{" "}
              <Link href="/login" className="text-zinc-400 hover:text-white underline transition-colors">
                Log in
              </Link>
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800 py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-orange-500 font-bold text-sm tracking-tight">CodePrep</span>
          <span className="text-xs text-zinc-600">© 2026 CodePrep. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
