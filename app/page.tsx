// app/page.tsx
import AuthBadge from "../components/AuthBadge";

const BRAND = {
  green: "#0B2A1E",
  bg: "#F9FAFB",
};

export default function HomePage() {
  return (
    <div style={{ background: BRAND.bg, minHeight: "100vh" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-8 py-4 border-b"
        style={{ borderColor: "#E5E7EB" }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="DiGiulio Group"
            className="h-8 w-auto"
          />
          <span className="font-semibold text-lg" style={{ color: BRAND.green }}>
            DiGiulio Agent Dashboard
          </span>
        </div>
        <nav className="text-sm flex items-center gap-5">
          <a href="/leads" style={{ color: BRAND.green }}>
            Leads
          </a>
          <a href="/buyer-budget" style={{ color: BRAND.green }}>
            Buyer Budget Tool
          </a>
          <a href="/leads/add" style={{ color: BRAND.green }}>
            Add Lead
          </a>
          {/* Auth badge (sign in / sign out) */}
          <AuthBadge />
        </nav>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-semibold" style={{ color: BRAND.green }}>
          Welcome to the Agent Dashboard
        </h1>
        <p className="mt-4 text-gray-700 text-lg">
          Use this dashboard to manage leads, calculate buyer budgets, and track your activity.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <a
            href="/leads"
            className="rounded-xl border bg-white p-6 shadow hover:shadow-md transition"
          >
            <h2 className="text-xl font-medium" style={{ color: BRAND.green }}>
              Lead Claim Board →
            </h2>
            <p className="mt-2 text-gray-600 text-sm">
              Claim and manage new buyer & renter leads.
            </p>
          </a>

          <a
            href="/buyer-budget"
            className="rounded-xl border bg-white p-6 shadow hover:shadow-md transition"
          >
            <h2 className="text-xl font-medium" style={{ color: BRAND.green }}>
              Buyer Budget Tool →
            </h2>
            <p className="mt-2 text-gray-600 text-sm">
              Help clients understand their purchasing power and monthly costs.
            </p>
          </a>
        </div>
      </main>
    </div>
  );
}
