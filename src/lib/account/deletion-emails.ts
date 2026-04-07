import { sendEmail } from "@/lib/email/resend";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SUPPORT_EMAIL = "support@channelpulse.us";

export async function sendDeletionScheduledEmail(
  to: string,
  purgeAfterDate: string,
  cancelToken: string
) {
  const recoveryUrl = `${SITE_URL}/account/recover-deletion?token=${encodeURIComponent(cancelToken)}`;
  const formattedDate = new Date(purgeAfterDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await sendEmail({
    to,
    subject: "Your ChannelPulse account is scheduled for deletion",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">Account deletion scheduled</h2>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          We received your request to delete your ChannelPulse account. Your account has been deactivated and is scheduled for <strong>permanent deletion on ${formattedDate}</strong>.
        </p>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          If you change your mind, you can recover your account within the next 5 days by clicking the button below:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${recoveryUrl}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Keep my account
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
          After ${formattedDate}, all your data — channels, orders, products, and analytics — will be permanently removed and cannot be recovered.
        </p>
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin-top: 24px;">
          If you didn't request this, please contact us immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color: #f59e0b;">${SUPPORT_EMAIL}</a>.
        </p>
      </div>
    `,
  });
}

export async function sendDeletionCancelledEmail(to: string) {
  await sendEmail({
    to,
    subject: "Your ChannelPulse account has been recovered",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">Account recovered</h2>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          Your ChannelPulse account deletion has been cancelled. Your account is fully active again — you can sign in at any time.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${SITE_URL}/login" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Sign in
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px;">
          All your data remains intact. Welcome back!
        </p>
      </div>
    `,
  });
}

export async function sendDeletionCompletedEmail(to: string) {
  await sendEmail({
    to,
    subject: "Your ChannelPulse account has been permanently deleted",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 16px;">Account deleted</h2>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          Your ChannelPulse account and all associated data have been permanently deleted. This action cannot be undone.
        </p>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
          If you'd like to use ChannelPulse again in the future, you're welcome to create a new account at any time.
        </p>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
          Questions? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color: #f59e0b;">${SUPPORT_EMAIL}</a>.
        </p>
      </div>
    `,
  });
}
