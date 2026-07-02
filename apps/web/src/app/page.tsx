import Link from "next/link";
import { Navbar } from "@/components/navbar";

const features = [
  {
    title: "Custom aliases",
    body: "Claim a memorable /alias or let LinkForge generate a collision-free code.",
  },
  {
    title: "Real-time analytics",
    body: "Clicks, unique visitors, referrers, countries and device breakdowns per link.",
  },
  {
    title: "Fast redirects",
    body: "A Redis read-through cache keeps the redirect path off the database.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4">
        <section className="py-20 text-center">
          <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-fg">
            Next.js · NestJS · Prisma · Redis
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Short links with{" "}
            <span className="text-brand">analytics that matter</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            LinkForge is a full-stack reference project: shorten URLs, share
            them, and watch the clicks roll in on a live dashboard.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/register" className="btn-primary">
              Create free account
            </Link>
            <Link href="/login" className="btn-ghost">
              Sign in
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
