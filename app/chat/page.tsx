import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import ChatClient from "../../components/ChatClient";

export const metadata = {
  title: "Agent Assistant • Chat",
};

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  // Not signed in → show sign-in prompt
  if (!session?.user?.email) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="border rounded-xl p-6 text-center max-w-md w-full">
          <h1 className="text-2xl font-semibold mb-2">DiGiulio Agent Assistant</h1>
          <p className="text-gray-600 mb-6">
            Sign in with your <b>@digiuliogroup.com</b> account to chat.
          </p>
          <a
            className="border rounded px-4 py-2"
            href="/api/auth/signin?callbackUrl=/chat"
          >
            Sign in with Google
          </a>
        </div>
      </main>
    );
  }

  // Signed in → show chat UI
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Agent Assistant</h1>
          <p className="text-sm text-gray-600">
            Ask about leases, application docs, REBNY forms, building policies, or anything
            in the shared Drive. I’ll answer with citations.
          </p>
        </div>
        <ChatClient />
      </div>
    </main>
  );
}
