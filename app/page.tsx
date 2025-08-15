import { getServerSession } from "next-auth";
// relative import to avoid alias issues
import { authOptions } from "../lib/auth";
import DashboardClient from "../components/DashboardClient";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="border rounded-xl p-6 max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold mb-2">DiGiulio Agent Dashboard</h1>
        <p className="text-gray-600 mb-6">
            Sign in with your <b>@digiuliogroup.com</b> account to continue.
          </p>
          <a href="/api/auth/signin?callbackUrl=/" className="inline-block border rounded px-4 py-2">
            Sign in with Google
          </a>
        </div>
      </main>
    );
  }

  return <DashboardClient email={session.user.email} />;
}
