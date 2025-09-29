import { GeistSans } from 'next/font/geist';

export default function Home() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md p-4">
        <h2 className="text-2xl font-bold mb-4">Agent Dashboard</h2>
        <nav>
          <ul>
            <li className="mb-2"><a href="#" className="text-blue-600 hover:underline">Home</a></li>
            <li className="mb-2"><a href="#" className="text-blue-600 hover:underline">Agents</a></li>
            <li className="mb-2"><a href="#" className="text-blue-600 hover:underline">Reports</a></li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Welcome, Agent!</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">Stats</h3>
            <p className="text-gray-600">Placeholder for agent stats.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">Tasks</h3>
            <p className="text-gray-600">Placeholder for tasks.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
