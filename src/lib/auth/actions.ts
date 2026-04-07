"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendVerificationEmail } from "@/lib/auth/verification-email";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const businessName = formData.get("businessName") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        business_name: businessName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    try {
      await sendVerificationEmail(data.user.id, email);
    } catch (e) {
      console.error("[signup] Failed to send verification email:", e);
    }
  }

  return { success: true };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("deletion_status")
      .eq("id", user.id)
      .single();

    if (profile?.deletion_status === "pending_deletion") {
      await supabase.auth.signOut();
      return {
        error:
          "This account is scheduled for deletion. Check your email for a recovery link, or contact support.",
      };
    }
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(process.env.NEXT_PUBLIC_SITE_URL ?? "https://channelpulse.us");
}

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organizations(*)")
    .eq("id", user.id)
    .single();

  return profile;
}
