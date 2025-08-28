// app/chat/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth"; // adjust if your path is /lib/auth

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="border rounded-xl p-6 text-center max-w-md w-full">
          <h1 className="text-2xl font-semibold mb-2">DiGiulio Agent Assistant</h1>
          <p className="text-gray-600 mb-6">
            Sign in with your <b>@digiuliogroup.com</b> account to chat.
          </p>
          <a className="border rounded px-4 py-2" href="/api/auth/signin?callbackUrl=/chat">
            Sign in with Google
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold">Agent Assistant</h1>
        <p className="text-sm text-gray-600 mb-4">
          We’re diagnosing the chat API. You can continue using the rest of the site.
        </p>
        {/* TODO: re-enable <ChatClient /> after API is fixed */}
      </div>
    </main>
  );
}
