// app/page.tsx
import Image from "next/image";

const BRAND = {
  green: "#0B2A1E",
  gold: "#C39A24",
  goldSoftBg: "rgba(195,154,36,0.12)",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div style={{ background: BRAND.gold }} className="h-1 w-full" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
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
          <a href="/leads" style={{ color: BRAND.green }}>Leads</a>
          <a href="/buyer-budget" style={{ color: BRAND.green }}>Buyer Budget Tool</a>
          <a href="/leads/add" style={{ color: BRAND.green }}>Add Lead</a>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <a href="/leads" className="group rounded-2xl border bg-white p-6 hover:shadow-lg transition">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: BRAND.goldSoftBg }}>
              <span>🧲</span>
            </div>
            <h3 className="text-lg font-semibold" style={{ color: BRAND.green }}>Lead Claim Board</h3>
            <p className="mt-1 text-sm text-gray-700">
              Claim new inquiries. Contact info unlocks after claiming.
            </p>
          </a>

          <a href="/buyer-budget" className="group rounded-2xl border bg-white p-6 hover:shadow-lg transition">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: BRAND.goldSoftBg }}>
              <span>💰</span>
            </div>
            <h3 className="text-lg font-semibold" style={{ color: BRAND.green }}>Buyer Budget Tool</h3>
            <p className="mt-1 text-sm text-gray-700">
              Convert monthly budget ↔ purchase price with fees.
            </p>
          </a>

          <a href="/leads/add" className="group rounded-2xl border bg-white p-6 hover:shadow-lg transition">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: BRAND.goldSoftBg }}>
              <span>➕</span>
            </div>
            <h3 className="text-lg font-semibold" style={{ color: BRAND.green }}>Add Lead</h3>
            <p className="mt-1 text-sm text-gray-700">
              Manually add a prospect. Defaults to Unclaimed.
            </p>
          </a>
        </div>
      </section>
    </main>
  );
}
