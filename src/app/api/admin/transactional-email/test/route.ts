import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/queries";
import { sendEmail } from "@/lib/email/resend";
import {
  TRANSACTIONAL_EMAIL_TEST_TYPES,
  isTransactionalEmailTestType,
} from "@/lib/email/transactional-email-meta";
import { buildTransactionalTestEmail } from "@/lib/email/transactional-test-samples";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTransactionalOutgoing } from "@/lib/email/resolve-transactional-outgoing";

/** Admin: send production HTML from `lib/email/templates.ts` to any address (subject prefixed with [TEST]). */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: { type?: string; recipientEmail?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.recipientEmail ?? "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid recipientEmail required" }, { status: 400 });
  }

  const type = body.type;
  if (!type || !isTransactionalEmailTestType(type)) {
    return NextResponse.json(
      { error: "Invalid type", allowed: [...TRANSACTIONAL_EMAIL_TEST_TYPES] },
      { status: 400 }
    );
  }

  const sb = createAdminClient();
  const resolved = await resolveTransactionalOutgoing(sb, type, () => buildTransactionalTestEmail(type));
  if (resolved.skip) {
    return NextResponse.json(
      {
        error:
          "This template is hidden (inactive). Turn it on with the eye icon in Email admin to send a test.",
      },
      { status: 400 }
    );
  }

  const result = await sendEmail({
    to: email,
    subject: `[TEST] ${resolved.subject}`,
    html: resolved.html,
  });

  if (!result) {
    return NextResponse.json({ error: "Failed to send (check RESEND_API_KEY and Resend logs)" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    emailId: result.id,
    sentTo: email,
    type,
  });
}
