import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "ChannelPulse <onboarding@resend.dev>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email to", to);
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return null;
    }

    return data;
  } catch (e) {
    console.error("Email send failed:", e);
    return null;
  }
}

export async function sendBatchEmails(
  emails: SendEmailOptions[]
) {
  if (!process.env.RESEND_API_KEY || emails.length === 0) return [];

  try {
    const { data, error } = await resend.batch.send(
      emails.map((e) => ({ from: FROM_ADDRESS, ...e }))
    );
    if (error) {
      console.error("Resend batch error:", error);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.error("Batch email failed:", e);
    return [];
  }
}
