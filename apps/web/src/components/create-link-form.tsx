"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createLinkSchema, type CreateLinkDto } from "@linkforge/shared";
import { useCreateLink } from "@/lib/hooks";
import type { NormalizedError } from "@/lib/api";

export function CreateLinkForm() {
  const create = useCreateLink();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLinkDto>({ resolver: zodResolver(createLinkSchema) });

  async function onSubmit(values: CreateLinkDto) {
    try {
      // Drop the empty alias so the server generates a code.
      const payload = values.customAlias
        ? values
        : { url: values.url };
      const link = await create.mutateAsync(payload);
      toast.success(`Created ${link.shortUrl}`);
      reset();
    } catch (err) {
      toast.error((err as NormalizedError).message ?? "Could not create link");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <h2 className="font-semibold">Shorten a URL</h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <input
            className="input"
            placeholder="https://example.com/very/long/link"
            {...register("url")}
          />
          {errors.url && (
            <p className="mt-1 text-xs text-red-600">{errors.url.message}</p>
          )}
        </div>
        <div className="sm:w-48">
          <input
            className="input"
            placeholder="custom-alias (optional)"
            {...register("customAlias")}
          />
          {errors.customAlias && (
            <p className="mt-1 text-xs text-red-600">
              {errors.customAlias.message}
            </p>
          )}
        </div>
        <button className="btn-primary" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Shorten"}
        </button>
      </div>
    </form>
  );
}
