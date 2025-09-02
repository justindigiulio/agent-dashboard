'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-xl font-semibold mb-2">Something went wrong in this page</h1>
      <pre className="whitespace-pre-wrap text-sm bg-[#111] text-white p-3 rounded">
{String(error?.message || error)}
      </pre>
      {error?.stack ? (
        <details className="mt-2">
          <summary className="cursor-pointer">Stack</summary>
          <pre className="whitespace-pre-wrap text-xs bg-[#111] text-white p-3 rounded">
{error.stack}
          </pre>
        </details>
      ) : null}
      <button
        onClick={() => reset()}
        className="mt-4 rounded border px-3 py-1.5 text-sm"
      >
        Try again
      </button>
    </main>
  );
}
