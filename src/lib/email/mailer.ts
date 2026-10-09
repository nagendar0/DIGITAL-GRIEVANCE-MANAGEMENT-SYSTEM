import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER || "resolveai274@gmail.com";
  const pass = (process.env.SMTP_PASS || "emhe rlnj hbef flhh").replace(/\s+/g, "");

  return { host, port, secure, user, pass };
}

export function createMailerTransport() {
  const { host, port, secure, user, pass } = getSmtpConfig();

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function sendOtpEmail(
  toEmail: string,
  otpCode: string,
  roleContext: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = getSmtpConfig();
    const fromAddress = `"ResolveAI" <${config.user}>`;

    const transporter = createMailerTransport();

    const isPasswordReset = roleContext.toLowerCase().includes("password reset");
    // Natural, standard transactional subject line (matches Google, GitHub, Supabase OTPs)
    const subject = isPasswordReset
      ? `${otpCode} is your ResolveAI password reset code`
      : `${otpCode} is your ResolveAI verification code`;

    // Clean plain text version (essential for spam filter score)
    const text = isPasswordReset
      ? `Hi,\n\nYour ResolveAI password reset code is:\n\n${otpCode}\n\nThis code will expire in 10 minutes. Please enter it to reset your ResolveAI account password.\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nResolveAI Team\nsupport@resolveai.org`
      : `Hi,\n\nYour ResolveAI verification code is:\n\n${otpCode}\n\nThis code will expire in 10 minutes. Please enter it to complete your ${roleContext} registration.\n\nIf you did not request this verification code, please ignore this email.\n\nBest regards,\nResolveAI Team\nsupport@resolveai.org`;

    // Clean, minimalist HTML with zero spam-trigger words and no external CSS classes
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isPasswordReset ? "Password Reset Code" : "Verification Code"}</title>
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 32px 24px;">
    
    <div style="margin-bottom: 24px;">
      <span style="font-size: 20px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px;">ResolveAI</span>
    </div>

    <p style="font-size: 15px; line-height: 1.5; color: #374151; margin: 0 0 16px 0;">Hi,</p>

    <p style="font-size: 15px; line-height: 1.5; color: #374151; margin: 0 0 24px 0;">
      ${
        isPasswordReset
          ? "Use the following verification code to reset the password for your ResolveAI account:"
          : `Use the following verification code to confirm your email address for your <strong>${roleContext}</strong> account:`
      }
    </p>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 18px 24px; text-align: center; margin: 0 0 24px 0;">
      <span style="font-family: 'SF Mono', Consolas, Menlo, Monaco, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e40af; display: inline-block;">${otpCode}</span>
    </div>

    <p style="font-size: 14px; line-height: 1.5; color: #6b7280; margin: 0 0 24px 0;">
      This code is valid for 10 minutes. For your security, do not share this code with anyone.
    </p>

    <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;">

    <p style="font-size: 12px; line-height: 1.5; color: #9ca3af; margin: 0;">
      If you did not request this code, you can safely ignore this email.<br>
      ResolveAI Civic Verification Service
    </p>
  </div>
</body>
</html>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      replyTo: config.user,
      subject,
      text,
      html,
      headers: {
        "X-Priority": "3",
        "X-MSMail-Priority": "Normal",
        Importance: "Normal",
        "List-Unsubscribe": `<mailto:${config.user}?subject=unsubscribe>`,
      },
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("sendOtpEmail error:", err);
    return {
      success: false,
      error: err?.message || "Failed to deliver OTP email via SMTP",
    };
  }
}
