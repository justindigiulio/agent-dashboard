"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/** TEMP auth stub — same pattern as your /leads page */
function useAuth() {
  return {
    isAuthenticated: true,
    user: { id: "agent_123", name: "Test Agent", email: "agent@test.com" },
    token: "agent_123",
  } as const;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none " +
        "focus:ring-2 focus:ring-emerald-500 " + (props.className || "")
      }
    />
  );
}
function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={
        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none " +
        "focus:ring-2 focus:ring-emerald-500 " + (props.className || "")
      }
    />
  );
}
function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={
        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none " +
        "focus:ring-2 focus:ring-emerald-500 " + (props.className || "")
      }
    />
  );
}
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "outline" };
function Button({ variant = "solid", className = "", ...rest }: ButtonProps) {
  const style =
    variant === "outline"
      ? "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
      : "bg-emerald-600 text-white hover:bg-emerald-700";
  return (
    <button
      {...rest}
      className={"inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition " + style + " " + className}
    />
  );
}

export default function NewLeadPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    neighborhood: "",
    priceMin: "",
    priceMax: "",
    leadType: "rent",
    bedrooms: "",
    bathrooms: "",
    notes: "",
    source: "Manual",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/leads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          priceMin: form.priceMin ? Number(form.priceMin) : undefined,
          priceMax: form.priceMax ? Number(form.priceMax) : undefined,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to create lead");
      }
      // Go back to the board
      router.push("/leads?created=1");
    } catch (err: any) {
      setError(err.message || "Failed to create lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Lead</h1>
        <p className="text-sm text-gray-600">New leads are created as <strong>Unclaimed</strong>. Contact info will be hidden until claimed.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextInput placeholder="First name" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
          <TextInput placeholder="Last name" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextInput placeholder="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          <TextInput placeholder="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextInput placeholder="City" value={form.city} onChange={(e) => update("city", e.target.value)} />
          <TextInput placeholder="Neighborhood" value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TextInput placeholder="Min Budget" type="number" value={form.priceMin} onChange={(e) => update("priceMin", e.target.value)} />
          <TextInput placeholder="Max Budget" type="number" value={form.priceMax} onChange={(e) => update("priceMax", e.target.value)} />
          <SelectInput value={form.leadType} onChange={(e) => update("leadType", e.target.value)}>
            <option value="rent">Rent</option>
            <option value="sale">Sale</option>
            <option value="commercial">Commercial</option>
          </SelectInput>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextInput placeholder="Bedrooms" type="number" value={form.bedrooms} onChange={(e) => update("bedrooms", e.target.value)} />
          <TextInput placeholder="Bathrooms" type="number" value={form.bathrooms} onChange={(e) => update("bathrooms", e.target.value)} />
        </div>

        <TextArea rows={4} placeholder="Notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextInput placeholder="Source (e.g., Manual, Meta)" value={form.source} onChange={(e) => update("source", e.target.value)} />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create Lead"}</Button>
        </div>
      </form>
    </div>
  );
}
