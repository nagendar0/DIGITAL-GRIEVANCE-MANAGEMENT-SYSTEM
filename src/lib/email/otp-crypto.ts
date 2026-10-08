import crypto from "crypto";

const OTP_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "resolveai-secret-otp-signing-key";

/**
 * Generate a cryptographically secure HMAC signature for verified emails
 */
export function signVerifiedEmail(email: string): string {
  const cleanEmail = email.trim().toLowerCase();
  const timestamp = Date.now().toString();
  const payload = `${cleanEmail}:${timestamp}`;
  const signature = crypto.createHmac("sha256", OTP_SECRET).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

/**
 * Validate HMAC signature for a verified email
 */
export function verifyEmailSignature(token: string, expectedEmail: string): boolean {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return false;
    const [email, timestampStr, signature] = parts;
    if (email.toLowerCase() !== expectedEmail.trim().toLowerCase()) return false;

    const timestamp = parseInt(timestampStr, 10);
    // Token valid for 30 minutes after verification
    if (Date.now() - timestamp > 30 * 60 * 1000) return false;

    const payload = `${email}:${timestampStr}`;
    const expectedSig = crypto.createHmac("sha256", OTP_SECRET).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}
