import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import DashboardClient from "../components/DashboardClient";

// Small helper to show live Landlord Inbox count on the hero
async function getLandlordCount() {
  try {
    const base = process.env.NEXTAUTH_URL || "";
    if (!base) return 0;
    const r = await fetch(`${base}/api/landlord/search`, { cache: "no-store" });
    if (!r.ok) return 0;
    const data = await r.json();
    return Number(data?.total || 0);
  } catch {
    return 0;
  }
}

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <main className="relative min-h-screen overflow-hidden">
        {/* background glow */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-blue-50" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full blur-3xl opacity-30 bg-indigo-300" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full blur-3xl opacity-30 bg-blue-300" />

        <section className="grid place-items-center px-6 py-28 text-center">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-gray-600">
              DiGiulio Group • Agent Platform
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">
              Welcome to the <span className="text-indigo-600">Agent Dashboard</span>
            </h1>
            <p className="mt-4 text-gray-600">
              Secure hub for documents, listings, and upcoming tools — built for DiGiulio agents.
            </p>
            <a
              href="/api/auth/signin?callbackUrl=/"
              className="mt-8 inline-block rounded-xl border px-5 py-2.5 font-medium hover:bg-gray-50"
            >
              Sign in with Google
            </a>
            <p className="mt-3 text-xs text-gray-500">
              Use your <b>@digiuliogroup.com</b> account.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const landlordCount = await getLandlordCount();

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500" />
            <span className="font-semibold">DiGiulio Agent Dashboard</span>
          </div>
          <nav className="text-sm flex items-center gap-5">
            <a href="/" className="underline">Docs</a>
            <a href="/listings">YGL IDX</a>
            <a href="/listings/landlord">Landlord Inbox</a>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">{session.user.email}</span>
            <a href="/api/auth/signout?callbackUrl=/" className="text-gray-500">Sign out</a>
          </nav>
        </div>
      </header>

      {/* Hero / quick actions */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-blue-50" />
        <div className="absolute left-[-10%] top-[-30%] h-[28rem] w-[28rem] rounded-full bg-indigo-300 opacity-25 blur-3xl" />
        <div className="absolute right-[-10%] bottom-[-30%] h-[28rem] w-[28rem] rounded-full bg-blue-300 opacity-25 blur-3xl" />

        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Card: Landlord Inbox */}
            <a
              href="/listings/landlord"
              className="group rounded-2xl border bg-white p-6 transition hover:shadow-md"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <span>📬</span>
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">Landlord Inbox</h3>
                <span className="text-xs text-blue-600">
                  {landlordCount} new
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Daily landlord blasts parsed into a searchable feed.
              </p>
              <div className="mt-4 text-sm text-blue-600 underline opacity-0 transition group-hover:opacity-100">
                Open inbox →
              </div>
            </a>

            {/* Card: YGL IDX */}
            <a
              href="/listings"
              className="group rounded-2xl border bg-white p-6 transition hover:shadow-md"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <span>🏙️</span>
              </div>
              <h3 className="text-lg font-semibold">YGL IDX Search</h3>
              <p className="mt-1 text-sm text-gray-600">
                Full inventory via YouGotListings — behind agent login.
              </p>
              <div className="mt-4 text-sm text-indigo-600 underline opacity-0 transition group-hover:opacity-100">
                Launch IDX →
              </div>
            </a>

            {/* Card: Docs & Forms */}
            <a
              href="#docs"
              className="group rounded-2xl border bg-white p-6 transition hover:shadow-md"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                <span>📄</span>
              </div>
              <h3 className="text-lg font-semibold">Docs & Guidance</h3>
              <p className="mt-1 text-sm text-gray-600">
                Search shared Drive: leases, checklists, scripts, and more.
              </p>
              <div className="mt-4 text-sm text-violet-600 underline opacity-0 transition group-hover:opacity-100">
                Jump to search →
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-4 text-xl font-semibold">Coming soon</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: "🧮", title: "Commission Calculator", blurb: "Split scenarios, caps, net payout." },
            { icon: "💰", title: "Buyer Budget Tool", blurb: "Mortgage + taxes + closing costs = target rent/price." },
            { icon: "👤", title: "Agent Profile", blurb: "Portfolio, specialties, social links." },
            { icon: "📝", title: "Commission Request", blurb: "Standardized request → QuickBooks sync." },
            { icon: "📚", title: "Deal Log", blurb: "Track pipeline from lead → closed." },
            { icon: "🔔", title: "Saved Searches & Alerts", blurb: "Email/Slack alerts from YGL and Inbox." },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl border bg-white p-5">
              <div className="mb-2 text-2xl">{f.icon}</div>
              <div className="font-medium">{f.title}</div>
              <div className="text-sm text-gray-600">{f.blurb}</div>
              <div className="mt-3 inline-flex cursor-not-allowed items-center gap-2 rounded-lg border px-3 py-1.5 text-xs text-gray-500">
                In design
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Docs search (existing UI) */}
      <section id="docs" className="mx-auto max-w-6xl px-4 pb-14">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="mb-2 text-xl font-semibold">Docs & Guidance</h2>
          <p className="mb-4 text-sm text-gray-600">
            Search your shared Drive folder. Try terms like <em>lease</em>, <em>rider</em>, or <em>co-op board</em>.
          </p>
          <DashboardClient email={session.user.email} />
        </div>
      </section>
    </>
  );
}
