"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useDeleteLink, useLinks, useOverview } from "@/lib/hooks";
import { CreateLinkForm } from "@/components/create-link-form";
import { StatCard } from "@/components/stat-card";

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const overview = useOverview();
  const links = useLinks(page, search);
  const del = useDeleteLink();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total links" value={overview.data?.totalLinks ?? "—"} />
        <StatCard label="Total clicks" value={overview.data?.totalClicks ?? "—"} />
        <StatCard
          label="Clicks (7 days)"
          value={overview.data?.clicksLast7d ?? "—"}
        />
      </div>

      <CreateLinkForm />

      <div className="card">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-semibold">Your links</h2>
          <input
            className="input max-w-xs"
            placeholder="Search…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {links.isLoading ? (
          <p className="py-8 text-center text-slate-400">Loading…</p>
        ) : links.data && links.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 font-medium">Short</th>
                  <th className="py-2 font-medium">Destination</th>
                  <th className="py-2 text-right font-medium">Clicks</th>
                  <th className="py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.data.items.map((link) => (
                  <tr key={link.id} className="border-b border-slate-100">
                    <td className="py-3">
                      <button
                        className="font-medium text-brand-fg hover:underline"
                        onClick={() => {
                          void navigator.clipboard.writeText(link.shortUrl);
                          toast.success("Copied to clipboard");
                        }}
                      >
                        /{link.code}
                      </button>
                    </td>
                    <td className="max-w-xs truncate py-3 text-slate-600">
                      {link.url}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {link.clickCount}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/dashboard/links/${link.id}`}
                        className="mr-3 text-slate-600 hover:text-slate-900"
                      >
                        Analytics
                      </Link>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => del.mutate(link.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>
                Page {links.data.page} of {links.data.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  className="btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </button>
                <button
                  className="btn-ghost"
                  disabled={page >= links.data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-slate-400">
            No links yet — create your first one above.
          </p>
        )}
      </div>
    </div>
  );
}
