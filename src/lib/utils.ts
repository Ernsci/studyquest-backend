import { learning } from "../config/app-config";

/** Tiny class-name joiner (avoids a clsx dependency). */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percent(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return 0;
  return clamp(Math.round((part / whole) * 100), 0, 100);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0] ?? "").join("");
  return letters.length > 0 ? letters.toUpperCase() : "?";
}

/* ------------------------------------------------------------------ dates */
/** Local-time YYYY-MM-DD (Supabase `date` columns are timezone-free). */
export function toISODate(value: Date = new Date()): string {
  const y = value.getFullYear();
  const m = `${value.getMonth() + 1}`.padStart(2, "0");
  const d = `${value.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(value: string, days: number): string {
  const date = parseISODate(value);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function daysBetween(from: string, to: string): number {
  const a = parseISODate(from).getTime();
  const b = parseISODate(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = value.includes("T") ? new Date(value) : parseISODate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(value);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 1) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/* -------------------------------------------------------------------- xp */
/** XP needed to reach a level grows linearly: level n needs 100·n·(n-1)/2. */
export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * Math.max(0, xp)) / 100)) / 2));
}

export function xpForLevel(level: number): number {
  return (100 * (level - 1) * level) / 2;
}

export function levelProgress(xp: number): number {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  return percent(xp - floor, ceiling - floor);
}

export function nextLevelXp(xp: number): number {
  return xpForLevel(levelFromXp(xp) + 1);
}

/* ----------------------------------------------------------------- misc */
export function truncate(value: string, max = 120): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** Deterministic pick used for stable quiz assembly on the server. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  const rand = () => (state = (state * 16807) % 2147483647) / 2147483647;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function goalMinutes(): number {
  return learning.dailyGoalMinutes;
}

/** Escape user text before putting it in an aria-label or plain-text context. */
export function plainText(value: string): string {
  return value.replace(/[<>]/g, "");
}
