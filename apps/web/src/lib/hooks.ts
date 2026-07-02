"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CreateLinkDto,
  Link,
  LinkAnalytics,
  Paginated,
} from "@linkforge/shared";
import { api } from "./api";

interface Overview {
  totalLinks: number;
  totalClicks: number;
  clicksLast7d: number;
}

export function useOverview() {
  return useQuery({
    queryKey: ["overview"],
    queryFn: async () => (await api.get<Overview>("/analytics/overview")).data,
  });
}

export function useLinks(page: number, search: string) {
  return useQuery({
    queryKey: ["links", page, search],
    queryFn: async () =>
      (
        await api.get<Paginated<Link>>("/links", {
          params: { page, pageSize: 10, search: search || undefined },
        })
      ).data,
    placeholderData: (prev) => prev,
  });
}

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateLinkDto) =>
      (await api.post<Link>("/links", dto)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["links"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/links/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["links"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useLinkAnalytics(id: string, days: number) {
  return useQuery({
    queryKey: ["analytics", id, days],
    queryFn: async () =>
      (
        await api.get<LinkAnalytics>(`/analytics/links/${id}`, {
          params: { days },
        })
      ).data,
    enabled: Boolean(id),
  });
}
