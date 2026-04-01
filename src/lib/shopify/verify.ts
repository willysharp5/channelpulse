import crypto from "crypto";

export function verifyHmac(
  query: Record<string, string>,
  secret: string
): boolean {
  const { hmac, ...rest } = query;
  if (!hmac) return false;

  const sortedParams = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("&");

  const computed = crypto
    .createHmac("sha256", secret)
    .update(sortedParams)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(computed, "hex"),
    Buffer.from(hmac, "hex")
  );
}

export function verifyWebhookHmac(
  body: string,
  hmacHeader: string,
  secret: string
): boolean {
  const computed = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(computed, "base64"),
    Buffer.from(hmacHeader, "base64")
  );
}
