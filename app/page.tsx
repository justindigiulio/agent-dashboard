// app/page.tsx
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import DashboardClient from "../components/DashboardClient";

const BRAND = {
  green: "#0B2A1E",
  gold: "#C39A24",
  goldSoftBg: "rgba(195,154,36,0.12)",
};

async function getLandlordCount() {
  try {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      process.env.NEXTAUTH_URL ||
      "";
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
      <main className="min-h-screen bg-white">
        <div style={{ background: BRAND.gold }} className="h-1 w-full" />
        <section className="mx-auto grid max-w-6xl place-items-center px-6 py-20 text-center">
          <div className="max-w-xl">
            <div className="mx-auto mb-6 flex justify-center">
              <Image
                src="/digiulio-logo.png"
                alt="DiGiulio Group"
                width={300}
                height={72}
                priority
                style={{
                  filter:
                    "drop-shadow(0 0.5px 0 #ffffff) drop-shadow(0 3px 10px rgba(0,0,0,.18))",
                }}
              />
            </div>
            <h1 className="text-4xl font-semibold" style={{ color: BRAND.green }}>
              Agent <span style={{ color: BRAND.gold }}>Dashboard</span>
            </h1>
            <p className="mt-4 text-gray-700">
              Secure hub for documents, listings, and upcoming tools.
            </p>
            <a
              href="/api/auth/signin?callbackUrl=/"
              className="mt-8 inline-block rounded-xl px-5 py-2.5 font-medium text-white"
              style={{ background: BRAND.green, boxShadow: "0 8px 20px rgba(11,42,30,.18)" }}
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
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur">
        <div style={{ background: BRAND.gold }} className="h-1 w-full" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Image
            src="/digiulio-logo.png"
            alt="DiGiulio Group"
            width={200}
            height={48}
            priority
            style={{
              filter:
                "drop-shadow(0 0.5px 0 #ffffff) drop-shadow(0 2px 8px rgba(0,0,0,.16))",
            }}
          />
          <nav className="text-sm flex items-center gap-5">
            <a href="/" style={{ color: BRAND.green }}>Docs</a>
            <a href="/listings" style={{ color: BRAND.green }}>YGL IDX</a>
            <a href="/listings/landlord" style={{ color: BRAND.green }}>Landlord Inbox</a>
            <a href="#roadmap" style={{ color: BRAND.green }}>Roadmap</a>
            <span className="text-gray-300">|</span>
            <span className="text-gray-700">{session.user.email}</span>
            <a href="/api/auth/signout?callbackUrl=/" className="text-gray-500">Sign out</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 md:grid-cols-3">
          <a href="/listings/landlord" className="group rounded-2xl border bg-white p-6 hover:shadow-lg transition">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: BRAND.goldSoftBg }}>
              <span>📬</span>
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-semibold" style={{ color: BRAND.green }}>Landlord Inbox</h3>
              <span className="text-xs" style={{ color: BRAND.gold }}>{landlordCount} new</span>
            </div>
            <p className="mt-1 text-sm text-gray-700">Daily landlord blasts parsed into a searchable feed.</p>
          </a>

          <a href="/listings" className="group rounded-2xl border bg-white p-6 hover:shadow-lg transition">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: BRAND.goldSoftBg }}>
              <span>🏙️</span>
            </div>
            <h3 className="text-lg font-semibold" style={{ color: BRAND.green }}>YGL IDX Search</h3>
            <p className="mt-1 text-sm text-gray-700">Full inventory via YouGotListings — behind agent login.</p>
          </a>

          <a href="#docs" className="group rounded-2xl border bg-white p-6 hover:shadow-lg transition">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: BRAND.goldSoftBg }}>
              <span>📄</span>
            </div>
            <h3 className="text-lg font-semibold" style={{ color: BRAND.green }}>Docs & Guidance</h3>
            <p className="mt-1 text-sm text-gray-700">Search your shared Drive: leases, checklists, scripts, and more.</p>
          </a>
        </div>
      </section>

      <section id="roadmap" className="mx-auto max-w-6xl px-4 pb-10">
        <h2 className="mb-4 text-xl font-semibold" style={{ color: BRAND.green }}>Coming soon</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: "🧮", title: "Commission Calculator", blurb: "Split scenarios, caps, net payout." },
            { icon: "💰", title: "Buyer Budget Tool", blurb: "Mortgage, taxes & closing costs → target budget." },
            { icon: "👤", title: "Agent Profile", blurb: "Portfolio, specialties, social links." },
            { icon: "📝", title: "Commission Request", blurb: "Standardized requests that sync to accounting." },
            { icon: "📚", title: "Deal Log", blurb: "Track pipeline from lead → closed." },
            { icon: "🔔", title: "Saved Searches & Alerts", blurb: "Notifications from YGL & Landlord Inbox." },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl border bg-white p-5 hover:shadow-md transition">
              <div className="mb-2 text-2xl">{f.icon}</div>
              <div className="font-medium" style={{ color: BRAND.green }}>{f.title}</div>
              <div className="text-sm text-gray-700">{f.blurb}</div>
              <div className="mt-3 inline-flex cursor-not-allowed items-center gap-2 rounded-lg border px-3 py-1.5 text-xs text-gray-500">
                In design
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="docs" className="mx-auto max-w-6xl px-4 pb-14">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="mb-2 text-xl font-semibold" style={{ color: BRAND.green }}>Docs & Guidance</h2>
          <p className="mb-4 text-sm text-gray-700">
            Search your shared Drive folder. Try terms like <em>lease</em>, <em>rider</em>, or <em>co-op board</em>.
          </p>
          <DashboardClient email={session.user.email!} />
        </div>
      </section>
    </>
  );
}
