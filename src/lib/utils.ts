import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatGrievanceId(id: string | number): string {
  if (typeof id === "string" && id.startsWith("RV-")) return id;
  return `RV-${String(id).padStart(4, "0")}`;
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters * 10) / 10} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): string {
  if (!start || !end) return "N/A";
  const diffMs = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "< 1 min";
  if (diffMins < 60) return `${diffMins} mins`;
  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  if (diffHours < 24) return `${diffHours}h ${remMins}m`;
  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;
  return `${diffDays}d ${remHours}h`;
}
