export type UserRole = "user" | "super_admin";
export type UserStatus = "active" | "banned";
export type SubscriptionPlan = "free" | "starter" | "growth" | "scale";
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing";

export interface UserChannel {
  platform: string;
  name: string;
  status: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  banned_at: string | null;
  banned_reason: string | null;
  org_id: string | null;
  created_at: string;
  updated_at: string;
  channels: UserChannel[];
}

export interface AdminUserDetail extends AdminUser {
  /** When false, Overview shows the guided tour on next visit (until completed). */
  has_seen_dashboard_tour: boolean;
  organization: {
    id: string;
    name: string;
    onboarding_completed: boolean;
  } | null;
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    amount: number;
    current_period_end: string | null;
  } | null;
  channels_count: number;
  orders_count: number;
  total_revenue: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  org_id: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  amount: number;
  currency: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  admin_email?: string;
  target_email?: string;
}

export interface ImpersonationSession {
  id: string;
  admin_id: string;
  target_user_id: string;
  started_at: string;
  ended_at: string | null;
  expires_at: string;
  is_active: boolean;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  totalOrganizations: number;
  totalChannels: number;
  activeSubscriptions: number;
  mrr: number;
  newUsersLast7d: number;
  newUsersLast30d: number;
  cancelledLast30d: number;
}

export interface SignupDataPoint {
  date: string;
  count: number;
}
