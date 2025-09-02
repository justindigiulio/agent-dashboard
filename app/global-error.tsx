'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body>
        <main className="min-h-screen p-6">
          <h1 className="text-xl font-semibold mb-2">App crashed</h1>
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
          <a href="/" className="mt-4 inline-block rounded border px-3 py-1.5 text-sm">Go home</a>
        </main>
      </body>
    </html>
  );
}
