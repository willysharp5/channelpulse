import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminDashboardStats,
  AdminUser,
  AdminUserDetail,
  AuditLogEntry,
  Subscription,
  SignupDataPoint,
} from "@/types/admin";

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

async function getProfilesWithEmail(): Promise<AdminUser[]> {
  const sb = createAdminClient();
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, full_name, role, status, banned_at, banned_reason, org_id, created_at, updated_at")
    .order("created_at", { ascending: false });

  const {
    data: { users: authUsers },
  } = await sb.auth.admin.listUsers({ perPage: 1000 });

  const emailMap = new Map<string, string>();
  for (const u of authUsers ?? []) {
    emailMap.set(u.id, u.email ?? "");
  }

  return (profiles ?? []).map((p: Record<string, unknown>) => ({
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
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const sb = createAdminClient();

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: bannedUsers },
    { count: totalOrgs },
    { count: totalChannels },
    { data: activeSubs },
    { count: cancelledLast30d },
  ] = await Promise.all([
    sb.from("profiles").select("*", { count: "exact", head: true }),
    sb.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
    sb.from("profiles").select("*", { count: "exact", head: true }).eq("status", "banned"),
    sb.from("organizations").select("*", { count: "exact", head: true }),
    sb.from("channels").select("*", { count: "exact", head: true }),
    sb.from("subscriptions").select("amount").eq("status", "active"),
    sb.from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "cancelled")
      .gte("cancelled_at", new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);

  const mrr = (activeSubs ?? []).reduce((s: number, r: { amount: number }) => s + r.amount, 0);

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [{ count: newUsersLast7d }, { count: newUsersLast30d }] = await Promise.all([
    sb.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    sb.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
    bannedUsers: bannedUsers ?? 0,
    totalOrganizations: totalOrgs ?? 0,
    totalChannels: totalChannels ?? 0,
    activeSubscriptions: activeSubs?.length ?? 0,
    mrr: mrr / 100,
    newUsersLast7d: newUsersLast7d ?? 0,
    newUsersLast30d: newUsersLast30d ?? 0,
    cancelledLast30d: cancelledLast30d ?? 0,
  };
}

export async function getSignupTimeline(days = 30): Promise<SignupDataPoint[]> {
  const sb = createAdminClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: profiles } = await sb
    .from("profiles")
    .select("created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const byDay = new Map<string, number>();
  for (const p of profiles ?? []) {
    const day = p.created_at.split("T")[0];
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const result: SignupDataPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split("T")[0];
    result.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return result;
}

export async function getAdminUsers(
  search?: string,
  statusFilter?: string,
  planFilter?: string
): Promise<AdminUser[]> {
  let users = await getProfilesWithEmail();

  if (search) {
    const q = search.toLowerCase();
    users = users.filter(
      (u: AdminUser) =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q)
    );
  }

  if (statusFilter && statusFilter !== "all") {
    users = users.filter((u: AdminUser) => u.status === statusFilter);
  }

  if (planFilter && planFilter !== "all") {
    const sb = createAdminClient();
    if (planFilter === "free") {
      const { data: allSubs } = await sb.from("subscriptions").select("user_id").eq("status", "active");
      const paidUserIds = new Set((allSubs ?? []).map((s: { user_id: string }) => s.user_id));
      users = users.filter((u: AdminUser) => !paidUserIds.has(u.id));
    } else {
      const { data: subs } = await sb
        .from("subscriptions")
        .select("user_id")
        .eq("plan", planFilter)
        .eq("status", "active");
      const subUserIds = new Set((subs ?? []).map((s: { user_id: string }) => s.user_id));
      users = users.filter((u: AdminUser) => subUserIds.has(u.id));
    }
  }

  const sb = createAdminClient();
  const orgIds = users
    .map((u: AdminUser) => u.org_id)
    .filter((id: string | null): id is string => !!id);

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

  return users.map((u: AdminUser) => ({
    ...u,
    channels: u.org_id ? (channelsByOrg.get(u.org_id) ?? []) : [],
  })) as AdminUser[];
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

  const {
    data: { users: authUsers },
  } = await sb.auth.admin.listUsers({ perPage: 1 });
  const { data: authUser } = await sb.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? "";

  const [orgResult, subResult, channelsResult, ordersResult, revenueResult] = await Promise.all([
    profile.org_id
      ? sb.from("organizations").select("id, name, onboarding_completed").eq("id", profile.org_id).single()
      : Promise.resolve({ data: null }),
    sb.from("subscriptions").select("plan, status, amount, current_period_end").eq("user_id", userId).eq("status", "active").single(),
    profile.org_id
      ? sb.from("channels").select("*", { count: "exact", head: true }).eq("org_id", profile.org_id)
      : Promise.resolve({ count: 0 }),
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

  return {
    ...profile,
    email,
    has_seen_dashboard_tour: p.has_seen_dashboard_tour === true,
    organization: orgResult.data,
    subscription: subResult.data,
    channels_count: channelsResult.count ?? 0,
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

export async function getSubscriptions(
  search?: string,
  statusFilter?: string,
  planFilter?: string
): Promise<Subscription[]> {
  const sb = createAdminClient();

  let query = sb
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  if (planFilter && planFilter !== "all") {
    query = query.eq("plan", planFilter);
  }

  const { data: subs } = await query;
  if (!subs || subs.length === 0) return [];

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

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (s) =>
        s.user_email?.toLowerCase().includes(q) ||
        s.user_name?.toLowerCase().includes(q) ||
        s.stripe_customer_id?.includes(q)
    );
  }

  return result;
}

export async function getAuditLog(
  limit = 50,
  offset = 0,
  actionFilter?: string
): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const sb = createAdminClient();

  let countQuery = sb.from("admin_audit_log").select("*", { count: "exact", head: true });
  let query = sb
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (actionFilter && actionFilter !== "all") {
    query = query.eq("action", actionFilter);
    countQuery = countQuery.eq("action", actionFilter);
  }

  const [{ data: entries }, { count: total }] = await Promise.all([query, countQuery]);

  if (!entries || entries.length === 0) return { entries: [], total: 0 };

  const allUserIds = [
    ...new Set([
      ...entries.map((e: AuditLogEntry) => e.admin_id),
      ...entries.filter((e: AuditLogEntry) => e.target_user_id).map((e: AuditLogEntry) => e.target_user_id),
    ]),
  ];

  const {
    data: { users: authUsers },
  } = await sb.auth.admin.listUsers({ perPage: 1000 });

  const emailMap = new Map<string, string>();
  for (const u of authUsers ?? []) {
    emailMap.set(u.id, u.email ?? "");
  }

  const enriched = entries.map((e: AuditLogEntry) => ({
    ...e,
    admin_email: emailMap.get(e.admin_id),
    target_email: e.target_user_id ? emailMap.get(e.target_user_id) : null,
  }));

  return { entries: enriched as AuditLogEntry[], total: total ?? 0 };
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
