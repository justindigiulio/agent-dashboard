import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

export default async function ListingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="border rounded-xl p-6 text-center">
          <h1 className="text-2xl font-semibold mb-3">DiGiulio Agent Dashboard</h1>
          <p className="mb-6">Sign in with your @digiuliogroup.com account to view listings.</p>
          <a className="border rounded px-4 py-2" href="/api/auth/signin?callbackUrl=/listings">Sign in with Google</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="p-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-semibold">Listings</h1>
        <nav className="text-sm flex gap-4">
          <a href="/listings" className="font-medium underline">YGL IDX</a>
          <a href="/listings/landlord" className="text-gray-500">Landlord Inbox</a>
        </nav>
      </header>

      <div style={{ height: "calc(100vh - 64px)" }}>
        <iframe
          src="https://www.yougotlistings.com/client/idx.php?agent_id=110489"
          style={{ width: "100%", height: "100%", border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </main>
  );
}
