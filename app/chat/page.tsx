// app/chat/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";

export default async function ChatSmokeTest() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Agent Assistant — Smoke Test</h1>
      <p className="mb-2">If you can see this, the route renders correctly.</p>

      <div className="rounded border p-4 bg-white">
        <h2 className="font-medium mb-2">Session</h2>
        <pre className="text-sm overflow-auto">
{JSON.stringify(
  { loggedIn: !!session, user: session?.user?.email ?? null },
  null,
  2
)}
        </pre>
      </div>
    </main>
  );
}
