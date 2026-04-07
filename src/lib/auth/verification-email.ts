import { randomBytes, createHash } from "crypto";
import { sendEmail } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.channelpulse.us";

export async function sendVerificationEmail(userId: string, email: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const sb = createAdminClient();
  await sb
    .from("profiles")
    .update({
      verification_token_hash: tokenHash,
      verification_token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", userId);

  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}&user=${encodeURIComponent(userId)}`;

  await sendEmail({
    to: email,
    subject: "Confirm your ChannelPulse account",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">Confirm your email</h2>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          Thanks for signing up for ChannelPulse! Click the button below to confirm your email address and activate your account.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Confirm my account
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
          This link expires in 24 hours. If you didn't create a ChannelPulse account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
