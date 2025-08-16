'use client';

import { useEffect, useMemo, useState } from 'react';

type Listing = {
  received_at?: string;
  source_email?: string;
  subject?: string;
  address?: string;
  unit?: string;
  borough?: string;
  neighborhood?: string;
  type?: string;         // rental | sale
  price?: number | '';
  beds?: number | '';
  baths?: number | '';
  sqft?: number | '';
  fee?: boolean | '';
  pets?: string;
  message_id?: string;
};

function fmtPrice(v: number | '' | null | undefined) {
  if (v === '' || v == null || typeof v !== 'number') return '';
  return `$${v.toLocaleString()}`;
}
function fmtDate(s?: string) {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function LandlordInboxPage() {
  const [q, setQ] = useState('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [beds, setBeds] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Listing[]>([]);

  // Build query string based on UI inputs
  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (maxPrice.trim()) sp.set('max_price', maxPrice.trim());
    if (beds.trim()) sp.set('beds', beds.trim());
    // default to rentals, can expand later
    sp.set('type', 'rental');
    return sp.toString();
  }, [q, maxPrice, beds]);

  // Debounced fetch
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/landlord/search?${qs}`, { cache: 'no-store' });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Search failed');
        setRows(data.results || []);
      } catch (e: any) {
        setRows([]);
        setError(e.message || 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [qs]);

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Landlord Inbox</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search address, subject, neighborhood…"
          className="border rounded-lg px-3 py-2 w-full"
        />
        <input
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="Max price"
          inputMode="numeric"
          className="border rounded-lg px-3 py-2 w-full"
        />
        <select
          value={beds}
          onChange={(e) => setBeds(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full"
        >
          <option value="">Min beds</option>
          <option value="0">Studio/0</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
        </select>
        <div className="flex items-center text-sm text-gray-600">
          {loading ? 'Loading…' : error ? <span className="text-red-600">{error}</span> : `${rows.length} result(s)`}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left p-3">Received</th>
              <th className="text-left p-3">Address</th>
              <th className="text-left p-3">Beds</th>
              <th className="text-left p-3">Baths</th>
              <th className="text-left p-3">Price</th>
              <th className="text-left p-3">Fee</th>
              <th className="text-left p-3">Pets</th>
              <th className="text-left p-3">Subject</th>
              <th className="text-left p-3">From</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={(r.message_id || '') + i} className="odd:bg-white even:bg-gray-50">
                <td className="p-3 whitespace-nowrap">{fmtDate(r.received_at)}</td>
                <td className="p-3">
                  {r.address || <span className="text-gray-400 italic">—</span>}
                  {r.neighborhood ? <span className="text-gray-500 ml-2">({r.neighborhood})</span> : null}
                </td>
                <td className="p-3">{r.beds === '' ? '' : r.beds}</td>
                <td className="p-3">{r.baths === '' ? '' : r.baths}</td>
                <td className="p-3">{fmtPrice(r.price)}</td>
                <td className="p-3">
                  {r.fee === '' ? '' : r.fee === false ? (
                    <span className="rounded bg-green-100 text-green-800 px-2 py-0.5">No Fee</span>
                  ) : (
                    <span className="rounded bg-yellow-100 text-yellow-800 px-2 py-0.5">Fee</span>
                  )}
                </td>
                <td className="p-3">
                  {r.pets ? (
                    <span className="rounded bg-blue-100 text-blue-800 px-2 py-0.5 capitalize">{r.pets}</span>
                  ) : ''}
                </td>
                <td className="p-3">{r.subject || ''}</td>
                <td className="p-3">{r.source_email || ''}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && !error && (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={9}>No results</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
