"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerSchema, type RegisterDto } from "@linkforge/shared";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import type { NormalizedError } from "@/lib/api";

export default function RegisterPage() {
  const { register: signup, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterDto>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterDto) {
    try {
      await signup(values);
      toast.success("Account created");
      router.push("/dashboard");
    } catch (err) {
      toast.error((err as NormalizedError).message ?? "Registration failed");
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="card">
          <h1 className="text-xl font-semibold">Create your account</h1>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="label">Name (optional)</label>
              <input className="input" {...register("name")} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" {...register("email")} />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" {...register("password")} />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
            <button className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create account"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Already registered?{" "}
            <Link href="/login" className="text-brand-fg hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
