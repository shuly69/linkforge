"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { BreakdownItem } from "@linkforge/shared";
import { useLinkAnalytics } from "@/lib/hooks";
import { ClicksChart } from "@/components/clicks-chart";
import { StatCard } from "@/components/stat-card";

const RANGES = [7, 30, 90] as const;

export default function LinkAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const [days, setDays] = useState<number>(30);
  const { data, isLoading } = useLinkAnalytics(params.id, days);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            {data ? `/${data.code}` : "Link analytics"}
          </h1>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`rounded-md px-3 py-1 text-sm ${
                days === r ? "bg-brand text-white" : "text-slate-600"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <p className="py-16 text-center text-slate-400">Loading analytics…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Total clicks" value={data.totalClicks} />
            <StatCard label="Unique visitors" value={data.uniqueVisitors} />
          </div>

          <div className="card">
            <h2 className="mb-4 font-semibold">Clicks over time</h2>
            <ClicksChart data={data.timeSeries} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Breakdown title="Top referrers" items={data.topReferrers} />
            <Breakdown title="Top countries" items={data.topCountries} />
            <Breakdown title="Devices" items={data.byDevice} />
          </div>
        </>
      )}
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: BreakdownItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.clicks));
  return (
    <div className="card">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No data yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label} className="text-sm">
              <div className="flex justify-between">
                <span className="truncate text-slate-600">{item.label}</span>
                <span className="tabular-nums text-slate-500">{item.clicks}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-brand"
                  style={{ width: `${(item.clicks / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
