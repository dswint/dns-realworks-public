import { Pool } from "pg";

const globalForPool = globalThis as unknown as { authPool?: Pool };

export type ProbeReason =
  "dns" | "permission" | "missing-table" | "connect" | "other";

export type AuthProbe =
  | { ok: true; count: number }
  | {
      ok: false;
      error: string;
      reason: ProbeReason;
      host: string | null;
    };

export function isDatabaseUrlValid(url = process.env.DATABASE_URL ?? "") {
  return /^(postgres|postgresql):\/\//i.test(url.trim());
}

export function databaseUrlHost(
  url = process.env.DATABASE_URL ?? "",
): string | null {
  const trimmed = url.trim();
  const match = trimmed.match(/^[a-z][a-z0-9+.-]*:\/\/(?:[^@]*@)?([^:/?]+)/i);
  if (match?.[1]) return match[1];
  if (trimmed && !trimmed.includes("://")) {
    return trimmed.split(/[/?#]/)[0] || null;
  }
  return null;
}

function classifyProbeError(message: string): ProbeReason {
  const lower = message.toLowerCase();
  if (
    lower.includes("enotfound") ||
    lower.includes("eai_again") ||
    lower.includes("getaddrinfo")
  ) {
    return "dns";
  }
  if (lower.includes("econnrefused") || lower.includes("etimedout")) {
    return "connect";
  }
  if (lower.includes("permission denied") || lower.includes("42501")) {
    return "permission";
  }
  if (lower.includes("does not exist") || lower.includes("42p01")) {
    return "missing-table";
  }
  return "other";
}

export function resolveDatabaseUrl(raw = process.env.DATABASE_URL ?? "") {
  const fallback = raw.trim() || "postgresql://127.0.0.1:5432/postgres";
  try {
    const url = new URL(fallback);
    const match = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (match) {
      const ref = match[1];
      const region = process.env.SUPABASE_POOLER_REGION ?? "us-west-1";
      url.hostname = `aws-0-${region}.pooler.supabase.com`;
      url.port = "5432";
      if (url.username === "postgres") {
        url.username = `postgres.${ref}`;
      }
    }
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return fallback;
  }
}

export function getPool(): Pool {
  if (!globalForPool.authPool) {
    const connectionString = resolveDatabaseUrl();
    const host = databaseUrlHost(connectionString);
    const isSupabase = host?.includes("supabase.com") ?? false;
    globalForPool.authPool = new Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 8000,
      ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalForPool.authPool;
}

export async function countAuthUsers(): Promise<number> {
  const { rows } = await getPool().query<{ n: string }>(
    'select count(*)::text as n from "user"',
  );
  return Number(rows[0]?.n ?? 0);
}

export async function probeAuthTables(): Promise<AuthProbe> {
  try {
    return { ok: true, count: await countAuthUsers() };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    return {
      ok: false,
      error: message,
      reason: classifyProbeError(message),
      host: databaseUrlHost(resolveDatabaseUrl()),
    };
  }
}

export async function countOrganizations(): Promise<number> {
  const { rows } = await getPool().query<{ n: string }>(
    'select count(*)::text as n from "organization"',
  );
  return Number(rows[0]?.n ?? 0);
}

export async function setUserAdminRole(userId: string): Promise<void> {
  await getPool().query('update "user" set role = $1 where id = $2', [
    "admin",
    userId,
  ]);
}
