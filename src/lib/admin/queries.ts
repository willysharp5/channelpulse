import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDateRange, type DateParams } from "@/lib/date-range-bounds";
import { tableDateRangeBounds } from "@/lib/table-date-range";
import { auditEntrySearchHaystack } from "@/lib/admin/audit-log-format";
import type {
  AdminDashboardStats,
  AdminUser,
  AdminUserDetail,
  AuditLogEntry,
  Subscription,
  SignupDataPoint,
} from "@/types/admin";

const ADMIN_USERS_PAGE_SIZE = 25;
const ADMIN_SUBS_PAGE_SIZE = 25;
const ADMIN_AUDIT_FETCH_CAP = 8000;

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") throw new Error("Not authorized");

  return user;
}

export async function getAdminDashboardStats(period: DateParams = { days: 30 }): Promise<AdminDashboardStats> {
  const sb = createAdminClient();
  const { fromStr, toStr } = getDateRange(period);
  const periodSince = `${fromStr}T00:00:00.000Z`;
  const periodUntil = `${toStr}T23:59:59.999Z`;

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: bannedUsers },
    { count: totalOrgs },
    { count: totalChannels },
    { data: activeSubs },
    { count: newUsersInPeriod },
    { count: cancelledInPeriod },
  ] = await Promise.all([
    sb.from("profiles").select("*", { count: "exact", head: true }),
    sb.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
    sb.from("profiles").select("*", { count: "exact", head: true }).eq("status", "banned"),
    sb.from("organizations").select("*", { count: "exact", head: true }),
    sb.from("channels").select("*", { count: "exact", head: true }),
    sb.from("subscriptions").select("amount").eq("status", "active"),
    sb.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", periodSince).lte("created_at", periodUntil),
    sb
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "cancelled")
      .not("cancelled_at", "is", null)
      .gte("cancelled_at", periodSince)
      .lte("cancelled_at", periodUntil),
  ]);

  const mrr = (activeSubs ?? []).reduce((s: number, r: { amount: number }) => s + r.amount, 0);

  return {
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
    bannedUsers: bannedUsers ?? 0,
    totalOrganizations: totalOrgs ?? 0,
    totalChannels: totalChannels ?? 0,
    activeSubscriptions: activeSubs?.length ?? 0,
    mrr: mrr / 100,
    newUsersInPeriod: newUsersInPeriod ?? 0,
    cancelledInPeriod: cancelledInPeriod ?? 0,
  };
}

function eachUtcDayYmd(fromYmd: string, toYmd: string): string[] {
  const out: string[] = [];
  const d = new Date(fromYmd + "T12:00:00.000Z");
  const end = new Date(toYmd + "T12:00:00.000Z");
  while (d <= end) {
    out.push(d.toISOString().split("T")[0]!);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export async function getSignupTimeline(period: DateParams = { days: 30 }): Promise<SignupDataPoint[]> {
  const sb = createAdminClient();
  const { fromStr, toStr } = getDateRange(period);
  const since = `${fromStr}T00:00:00.000Z`;
  const until = `${toStr}T23:59:59.999Z`;

  const { data: profiles } = await sb
    .from("profiles")
    .select("created_at")
    .gte("created_at", since)
    .lte("created_at", until)
    .order("created_at", { ascending: true });

  const byDay = new Map<string, number>();
  for (const p of profiles ?? []) {
    const day = (p.created_at as string).split("T")[0]!;
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const days = eachUtcDayYmd(fromStr, toStr);
  return days.map((key) => ({ date: key, count: byDay.get(key) ?? 0 }));
}

export type AdminUsersListInput = {
  search?: string;
  status?: string;
  plan?: string;
  channel?: string;
  range?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
  /** When false, return all matching users (e.g. API). */
  paginate?: boolean;
};

export async function getAdminUsersList(
  input: AdminUsersListInput = {}
): Promise<{ users: AdminUser[]; total: number; effectivePage: number }> {
  const sb = createAdminClient();
  const page = Math.max(1, input.page ?? 1);
  const paginate = input.paginate !== false;

  const { since, until } = tableDateRangeBounds(
    input.range ?? null,
    input.dateFrom ?? null,
    input.dateTo ?? null
  );

  let profileQ = sb
    .from("profiles")
    .select("id, full_name, role, status, banned_at, banned_reason, org_id, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (input.status && input.status !== "all") {
    profileQ = profileQ.eq("status", input.status);
  }
  if (since) {
    profileQ = profileQ.gte("created_at", since);
  }
  if (until) {
    profileQ = profileQ.lte("created_at", until);
  }

  const { data: profiles } = await profileQ;
  const profileRows = (profiles ?? []) as Record<string, unknown>[];

  const {
    data: { users: authUsers },
  } = await sb.auth.admin.listUsers({ perPage: 1000 });

  const emailMap = new Map<string, string>();
  for (const u of authUsers ?? []) {
    emailMap.set(u.id, u.email ?? "");
  }

  let merged: AdminUser[] = profileRows.map((p) => ({
    id: p.id as string,
    full_name: p.full_name as string | null,
    role: p.role as AdminUser["role"],
    status: p.status as AdminUser["status"],
    banned_at: p.banned_at as string | null,
    banned_reason: p.banned_reason as string | null,
    org_id: p.org_id as string | null,
    created_at: p.created_at as string,
    updated_at: p.updated_at as string,
    email: emailMap.get(p.id as string) ?? "",
    channels: [],
  }));

  const searchTrim = input.search?.trim().toLowerCase() ?? "";
  if (searchTrim) {
    merged = merged.filter(
      (u) =>
        u.email.toLowerCase().includes(searchTrim) ||
        (u.full_name ?? "").toLowerCase().includes(searchTrim)
    );
  }

  if (input.plan && input.plan !== "all") {
    if (input.plan === "free") {
      const { data: allSubs } = await sb.from("subscriptions").select("user_id").eq("status", "active");
      const paidUserIds = new Set((allSubs ?? []).map((s: { user_id: string }) => s.user_id));
      merged = merged.filter((u) => !paidUserIds.has(u.id));
    } else {
      const { data: subs } = await sb
        .from("subscriptions")
        .select("user_id")
        .eq("plan", input.plan)
        .eq("status", "active");
      const subUserIds = new Set((subs ?? []).map((s: { user_id: string }) => s.user_id));
      merged = merged.filter((u) => subUserIds.has(u.id));
    }
  }

  const orgIds = merged.map((u) => u.org_id).filter((id): id is string => !!id);
  const channelsByOrg = new Map<string, { platform: string; name: string; status: string }[]>();

  if (orgIds.length > 0) {
    const { data: channels } = await sb
      .from("channels")
      .select("org_id, platform, name, status")
      .in("org_id", orgIds);

    for (const ch of channels ?? []) {
      const list = channelsByOrg.get(ch.org_id) ?? [];
      list.push({ platform: ch.platform, name: ch.name, status: ch.status });
      channelsByOrg.set(ch.org_id, list);
    }
  }

  merged = merged.map((u) => ({
    ...u,
    channels: u.org_id ? (channelsByOrg.get(u.org_id) ?? []) : [],
  }));

  if (input.channel === "connected") {
    merged = merged.filter((u) => u.channels.length > 0);
  } else if (input.channel === "not_connected") {
    merged = merged.filter((u) => u.channels.length === 0);
  }

  const total = merged.length;
  if (!paginate) {
    return { users: merged, total, effectivePage: 1 };
  }

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_USERS_PAGE_SIZE));
  const effectivePage = Math.min(page, totalPages);
  const offset = (effectivePage - 1) * ADMIN_USERS_PAGE_SIZE;
  const users = merged.slice(offset, offset + ADMIN_USERS_PAGE_SIZE);

  return { users, total, effectivePage };
}

/** @deprecated Prefer getAdminUsersList; kept for admin API JSON export of all matches. */
export async function getAdminUsers(
  search?: string,
  statusFilter?: string,
  planFilter?: string
): Promise<AdminUser[]> {
  const { users } = await getAdminUsersList({
    search,
    status: statusFilter,
    plan: planFilter,
    paginate: false,
  });
  return users;
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const sb = createAdminClient();

  const { data: profile } = await sb
    .from("profiles")
    .select(
      "id, full_name, role, status, banned_at, banned_reason, org_id, created_at, updated_at, has_seen_dashboard_tour"
    )
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const { data: authUser } = await sb.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? "";

  const [orgResult, subResult, channelsCountResult, channelsListResult, ordersResult, revenueResult] =
    await Promise.all([
    profile.org_id
      ? sb.from("organizations").select("id, name, onboarding_completed").eq("id", profile.org_id).single()
      : Promise.resolve({ data: null }),
    sb.from("subscriptions").select("plan, status, amount, current_period_end").eq("user_id", userId).eq("status", "active").single(),
    profile.org_id
      ? sb.from("channels").select("*", { count: "exact", head: true }).eq("org_id", profile.org_id)
      : Promise.resolve({ count: 0 }),
    profile.org_id
      ? sb.from("channels").select("platform, name, status").eq("org_id", profile.org_id).order("name")
      : Promise.resolve({ data: [] as { platform: string; name: string; status: string }[] }),
    profile.org_id
      ? sb.from("orders").select("*", { count: "exact", head: true }).eq("org_id", profile.org_id)
      : Promise.resolve({ count: 0 }),
    profile.org_id
      ? sb.from("daily_stats").select("total_revenue").eq("org_id", profile.org_id)
      : Promise.resolve({ data: [] }),
  ]);

  const totalRevenue = (revenueResult.data ?? []).reduce(
    (s: number, r: { total_revenue: number }) => s + Number(r.total_revenue ?? 0),
    0
  );

  const p = profile as Record<string, unknown>;

  const channelRows = (channelsListResult.data ?? []) as { platform: string; name: string; status: string }[];

  return {
    ...profile,
    email,
    has_seen_dashboard_tour: p.has_seen_dashboard_tour === true,
    organization: orgResult.data,
    subscription: subResult.data,
    channels_count: channelsCountResult.count ?? 0,
    channels: channelRows.map((c) => ({
      platform: c.platform,
      name: c.name,
      status: c.status,
    })),
    orders_count: ordersResult.count ?? 0,
    total_revenue: totalRevenue,
  } as AdminUserDetail;
}

export async function banUser(adminId: string, userId: string, reason: string) {
  const sb = createAdminClient();

  await sb
    .from("profiles")
    .update({ status: "banned", banned_at: new Date().toISOString(), banned_reason: reason })
    .eq("id", userId);

  await logAuditEvent(adminId, "ban_user", userId, { reason });
}

export async function unbanUser(adminId: string, userId: string) {
  const sb = createAdminClient();

  await sb
    .from("profiles")
    .update({ status: "active", banned_at: null, banned_reason: null })
    .eq("id", userId);

  await logAuditEvent(adminId, "unban_user", userId);
}

export type SubscriptionsListInput = {
  search?: string;
  status?: string;
  plan?: string;
  range?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
};

export async function getSubscriptionsList(
  input: SubscriptionsListInput = {}
): Promise<{ subscriptions: Subscription[]; total: number; effectivePage: number }> {
  const sb = createAdminClient();
  const page = Math.max(1, input.page ?? 1);
  const { since, until } = tableDateRangeBounds(
    input.range ?? null,
    input.dateFrom ?? null,
    input.dateTo ?? null
  );

  let query = sb.from("subscriptions").select("*").order("created_at", { ascending: false });

  if (input.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }
  if (input.plan && input.plan !== "all") {
    query = query.eq("plan", input.plan);
  }
  if (since) {
    query = query.gte("created_at", since);
  }
  if (until) {
    query = query.lte("created_at", until);
  }

  const { data: subs } = await query;
  if (!subs || subs.length === 0) {
    return { subscriptions: [], total: 0, effectivePage: 1 };
  }

  const userIds = [...new Set(subs.map((s: Subscription) => s.user_id))];
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const {
    data: { users: authUsers },
  } = await sb.auth.admin.listUsers({ perPage: 1000 });

  const emailMap = new Map<string, string>();
  for (const u of authUsers ?? []) {
    emailMap.set(u.id, u.email ?? "");
  }

  const nameMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name])
  );

  let result = subs.map((s: Subscription) => ({
    ...s,
    user_email: emailMap.get(s.user_id) ?? "",
    user_name: nameMap.get(s.user_id) ?? null,
  })) as Subscription[];

  const searchTrim = input.search?.trim().toLowerCase() ?? "";
  if (searchTrim) {
    result = result.filter(
      (s) =>
        s.user_email?.toLowerCase().includes(searchTrim) ||
        (s.user_name ?? "").toLowerCase().includes(searchTrim) ||
        (s.stripe_customer_id ?? "").toLowerCase().includes(searchTrim) ||
        (s.stripe_subscription_id ?? "").toLowerCase().includes(searchTrim)
    );
  }

  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_SUBS_PAGE_SIZE));
  const effectivePage = Math.min(page, totalPages);
  const offset = (effectivePage - 1) * ADMIN_SUBS_PAGE_SIZE;
  const subscriptions = result.slice(offset, offset + ADMIN_SUBS_PAGE_SIZE);

  return { subscriptions, total, effectivePage };
}

export type AuditLogListInput = {
  limit?: number;
  page?: number;
  action?: string;
  range?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  /** Matches admin or target user email (substring). */
  emailSearch?: string;
  /** Matches text shown in the details column, action names, and raw payload values. */
  detailsSearch?: string;
};

function asAuditDetailsRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

export async function getAuditLogList(
  input: AuditLogListInput = {}
): Promise<{ entries: AuditLogEntry[]; total: number; effectivePage: number }> {
  const sb = createAdminClient();
  const limit = Math.min(100, Math.max(1, input.limit ?? 25));
  const page = Math.max(1, input.page ?? 1);

  const { since, until } = tableDateRangeBounds(
    input.range ?? null,
    input.dateFrom ?? null,
    input.dateTo ?? null
  );

  let query = sb
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(ADMIN_AUDIT_FETCH_CAP);

  if (input.action && input.action !== "all") {
    query = query.eq("action", input.action);
  }
  if (since) {
    query = query.gte("created_at", since);
  }
  if (until) {
    query = query.lte("created_at", until);
  }

  const { data: entries } = await query;
  if (!entries || entries.length === 0) {
    return { entries: [], total: 0, effectivePage: 1 };
  }

  const {
    data: { users: authUsers },
  } = await sb.auth.admin.listUsers({ perPage: 1000 });

  const emailMap = new Map<string, string>();
  for (const u of authUsers ?? []) {
    emailMap.set(u.id, u.email ?? "");
  }

  let enriched = entries.map((e: AuditLogEntry) => ({
    ...e,
    admin_email: emailMap.get(e.admin_id),
    target_email: e.target_user_id ? emailMap.get(e.target_user_id) ?? null : null,
  })) as AuditLogEntry[];

  const emailQ = input.emailSearch?.trim().toLowerCase() ?? "";
  if (emailQ) {
    enriched = enriched.filter((e) => {
      const admin = (e.admin_email ?? "").toLowerCase();
      const target = (e.target_email ?? "").toLowerCase();
      return admin.includes(emailQ) || target.includes(emailQ);
    });
  }

  const detailsQ = input.detailsSearch?.trim().toLowerCase() ?? "";
  if (detailsQ) {
    enriched = enriched.filter((e) =>
      auditEntrySearchHaystack(e.action, asAuditDetailsRecord(e.details)).includes(detailsQ)
    );
  }

  enriched = enriched.filter((e) => e.action !== "impersonate_end");

  const total = enriched.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const effectivePage = Math.min(page, totalPages);
  const start = (effectivePage - 1) * limit;
  const pageRows = enriched.slice(start, start + limit);

  return { entries: pageRows, total, effectivePage };
}

export async function logAuditEvent(
  adminId: string,
  action: string,
  targetUserId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string
) {
  const sb = createAdminClient();
  await sb.from("admin_audit_log").insert({
    admin_id: adminId,
    target_user_id: targetUserId ?? null,
    action,
    details: details ?? {},
    ip_address: ipAddress ?? null,
  });
}
