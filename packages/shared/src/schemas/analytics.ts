import { z } from "zod";

export const analyticsRangeSchema = z.object({
  /** Number of days to look back for the time-series. */
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type AnalyticsRangeQuery = z.infer<typeof analyticsRangeSchema>;

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  clicks: number;
}

export interface BreakdownItem {
  label: string;
  clicks: number;
}

export interface LinkAnalytics {
  linkId: string;
  code: string;
  totalClicks: number;
  uniqueVisitors: number;
  timeSeries: TimeSeriesPoint[];
  topReferrers: BreakdownItem[];
  topCountries: BreakdownItem[];
  byDevice: BreakdownItem[];
}
