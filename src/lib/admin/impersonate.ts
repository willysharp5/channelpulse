import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "./queries";

const IMPERSONATE_COOKIE = "x-impersonate-user-id";
const IMPERSONATE_SESSION_COOKIE = "x-impersonate-session-id";

export async function startImpersonation(adminId: string, targetUserId: string) {
  const sb = createAdminClient();

  await sb
    .from("admin_impersonation_sessions")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("admin_id", adminId)
    .eq("is_active", true);

  const { data: session } = await sb
    .from("admin_impersonation_sessions")
    .insert({
      admin_id: adminId,
      target_user_id: targetUserId,
    })
    .select()
    .single();

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, targetUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 3600,
    path: "/",
  });
  cookieStore.set(IMPERSONATE_SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 3600,
    path: "/",
  });

  await logAuditEvent(adminId, "impersonate_start", targetUserId);

  return session;
}

export async function endImpersonation(adminId: string) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(IMPERSONATE_SESSION_COOKIE)?.value;

  if (sessionId) {
    const sb = createAdminClient();
    await sb
      .from("admin_impersonation_sessions")
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq("id", sessionId);

    const { data: session } = await sb
      .from("admin_impersonation_sessions")
      .select("target_user_id")
      .eq("id", sessionId)
      .single();

    if (session) {
      await logAuditEvent(adminId, "impersonate_end", session.target_user_id);
    }
  }

  cookieStore.delete(IMPERSONATE_COOKIE);
  cookieStore.delete(IMPERSONATE_SESSION_COOKIE);
}

export async function getImpersonatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null;
}

export async function getImpersonatedUserInfo(): Promise<{
  userId: string;
  email: string;
  name: string;
} | null> {
  const userId = await getImpersonatedUserId();
  if (!userId) return null;

  const sb = createAdminClient();

  const { data: profile } = await sb
    .from("profiles")
    .select("id, full_name")
    .eq("id", userId)
    .single();

  const { data: authUser } = await sb.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? "";

  if (!profile) return null;

  return {
    userId: profile.id,
    email,
    name: profile.full_name ?? email,
  };
}
