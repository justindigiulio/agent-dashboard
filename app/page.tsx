import "../app/globals.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HomeIcon, Users, FileText } from "lucide-react"; // Renamed Home to HomeIcon

export default function Dashboard() { // Renamed from Home to Dashboard
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-geist">
      <aside className="w-64 bg-white shadow-lg p-4 fixed h-full border-r">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Agent Dashboard</h2>
        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start">
            <HomeIcon className="mr-2 h-4 w-4" /> Home
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Users className="mr-2 h-4 w-4" /> Agents
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <FileText className="mr-2 h-4 w-4" /> Reports
          </Button>
        </nav>
      </aside>
      <main className="ml-64 p-8 flex-1">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">Welcome, Agent!</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle>Stats</CardTitle>
              <CardDescription>Overview of key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Placeholder for agent stats.</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Pending actions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Placeholder for tasks.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
