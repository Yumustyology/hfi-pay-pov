/**
 * lib/email/brevo.ts
 *
 * Brevo (formerly Sendinblue) transactional email service.
 * Uses @getbrevo/brevo v5 SDK - new BrevoClient({ apiKey }) style.
 */

import { BrevoClient } from "@getbrevo/brevo";
import { headers } from "next/headers";

async function getAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  try {
    const headersList = await headers();
    const host = headersList.get("host");
    if (host) {
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      return `${protocol}://${host}`;
    }
  } catch {
    // Fallback if called outside a request context (e.g. static rendering / cron)
  }
  return "http://localhost:3000";
}

// Lazily-initialised so module load doesn't crash when key is absent
let _client: BrevoClient | null = null;

function getClient(): BrevoClient {
  if (_client) return _client;
  _client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY ?? "" });
  return _client;
}

function isConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaymentEmailParams {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  amount: string; // e.g. "0.05"
  reference: string; // HFI-20260628-AB32FF91
  intentId: string; // MongoDB _id used to build claim URL
}

export interface ClaimEmailParams {
  senderEmail: string;
  senderName: string;
  recipientName: string;
  amount: string;
  reference: string;
  txHash: string;
}

export interface RefundReminderEmailParams {
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  amount: string;
  reference: string;
}

export interface OtpEmailParams {
  email: string;
  otp: string;
  name?: string;
}

export async function sendOTPEmail(
  params: OtpEmailParams,
): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured()) {
    return { success: false, error: "BREVO_API_KEY not configured" };
  }

  const fromEmail = process.env.BREVO_SENDER_EMAIL ?? "noreply@hfipay.demo";
  const fromName = process.env.BREVO_SENDER_NAME ?? "HFI Pay";
  const recipientName = params.name || "HFI Pay User";

  try {
    await getClient().transactionalEmails.sendTransacEmail({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: params.email, name: recipientName }],
      subject: `Your HFI Pay verification code: ${params.otp}`,
      htmlContent: buildOtpHtml(params.otp, params.name),
    });

    console.log(`[Brevo] OTP verification email sent to ${params.email}`);
    return { success: true };
  } catch (err: any) {
    const msg = err?.message ?? "Unknown Brevo error";
    console.error("[Brevo] sendOTPEmail failed:", msg);
    return { success: false, error: msg };
  }
}

// ─── Send: Incoming Payment ──────────────────────────────────────────────────

export async function sendPaymentEmail(
  params: PaymentEmailParams,
): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured()) {
    console.warn("[Brevo] BREVO_API_KEY not set - skipping email.");
    return { success: false, error: "BREVO_API_KEY not configured" };
  }

  const appUrl = await getAppUrl();
  const claimUrl = `${appUrl}/claim/${params.intentId}`;
  const fromEmail = process.env.BREVO_SENDER_EMAIL ?? "noreply@hfipay.demo";
  const fromName = process.env.BREVO_SENDER_NAME ?? "HFI Pay";

  try {
    await getClient().transactionalEmails.sendTransacEmail({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: params.recipientEmail, name: params.recipientName }],
      subject: `💜 You've received ${params.amount} ETH on HFI Pay`,
      htmlContent: buildPaymentHtml({ ...params, claimUrl }),
    });

    console.log(`[Brevo] Payment email sent → ${params.recipientEmail}`);
    return { success: true };
  } catch (err: any) {
    const msg = err?.message ?? "Unknown Brevo error";
    console.error("[Brevo] sendPaymentEmail failed:", msg);
    return { success: false, error: msg };
  }
}

// ─── Send: Claim Confirmation ─────────────────────────────────────────────────

export async function sendClaimConfirmationEmail(
  params: ClaimEmailParams,
): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured())
    return { success: false, error: "BREVO_API_KEY not configured" };

  const fromEmail = process.env.BREVO_SENDER_EMAIL ?? "noreply@hfipay.demo";
  const fromName = process.env.BREVO_SENDER_NAME ?? "HFI Pay";

  try {
    await getClient().transactionalEmails.sendTransacEmail({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: params.senderEmail, name: params.senderName }],
      subject: `✅ Your payment of ${params.amount} ETH was claimed`,
      htmlContent: buildClaimHtml(params),
    });

    console.log(`[Brevo] Claim confirmation sent → ${params.senderEmail}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ─── Send: Refund Reminder ──────────────────────────────────────────────────

export async function sendRefundReminderEmail(
  params: RefundReminderEmailParams,
): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured())
    return { success: false, error: "BREVO_API_KEY not configured" };

  const fromEmail = process.env.BREVO_SENDER_EMAIL ?? "noreply@hfipay.demo";
  const fromName = process.env.BREVO_SENDER_NAME ?? "HFI Pay";

  try {
    await getClient().transactionalEmails.sendTransacEmail({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: params.senderEmail, name: params.senderName }],
      subject: `↩️ Action Required: Refund available for ${params.amount} ETH`,
      htmlContent: buildRefundReminderHtml(params),
    });

    console.log(`[Brevo] Refund reminder sent → ${params.senderEmail}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ─── HTML Templates ──────────────────────────────────────────────────────────

function buildOtpHtml(otp: string, name?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Verification Code - HFI Pay</title>
</head>
<body style="margin:0;padding:0;background:#07070f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111121;border-radius:20px;overflow:hidden;border:1px solid #1f1f38;">
        
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">🔐</div>
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">Verify Your Identity</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px;text-align:center;">
          <p style="color:#9090b0;font-size:14px;margin:0 0 20px;line-height:1.6;text-align:left;">
            Hello${name ? ` ${name}` : ""},
          </p>
          <p style="color:#9090b0;font-size:14px;margin:0 0 24px;line-height:1.6;text-align:left;">
            You requested a verification code to link your email address with HFI Pay. Use the code below to complete the verification:
          </p>
          
          <!-- Code Card -->
          <div style="background:#191932;border:1px solid #2d2d55;border-radius:14px;padding:24px;margin-bottom:24px;display:inline-block;letter-spacing:6px;font-size:36px;font-weight:900;color:#a78bfa;font-family:monospace;">
            ${otp}
          </div>

          <p style="color:#555;font-size:12px;margin:0;text-align:left;">
            This code will expire in 5 minutes. If you did not request this verification, please ignore this email.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 28px;text-align:center;color:#333;font-size:11px;border-top:1px solid #1a1a30;">
          HFI Pay PoV · Do not reply.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPaymentHtml(
  p: PaymentEmailParams & { claimUrl: string },
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>You received ${p.amount} ETH - HFI Pay</title>
</head>
<body style="margin:0;padding:0;background:#07070f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111121;border-radius:20px;overflow:hidden;border:1px solid #1f1f38;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 32px;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">💜</div>
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">HFI Pay</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Decentralised identity-based payments</p>
        </td></tr>

        <!-- Amount card -->
        <tr><td style="padding:28px 28px 0;">
          <div style="background:#191932;border:1px solid #2d2d55;border-radius:14px;padding:24px;text-align:center;">
            <p style="margin:0 0 4px;color:#7070a0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">You received</p>
            <p style="margin:0;color:#a78bfa;font-size:52px;font-weight:900;line-height:1.1;">${p.amount} <span style="font-size:20px;color:#5a5a8a;font-weight:400;">ETH</span></p>
            <p style="margin:8px 0 0;color:#555;font-size:12px;">Locked in smart contract escrow on Base Sepolia</p>
          </div>
        </td></tr>

        <!-- Details -->
        <tr><td style="padding:20px 28px;">
          <p style="margin:0 0 16px;color:#9090b0;font-size:14px;line-height:1.6;">
            <strong style="color:#d0d0e8;">${p.senderName}</strong> sent you ETH via HFI Pay. The funds are locked on-chain and waiting for you to claim them. They expire in 7 days.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
            <tr style="border-bottom:1px solid #1f1f38;">
              <td style="padding:10px 0;color:#555;">Reference</td>
              <td style="padding:10px 0;color:#bbb;font-family:monospace;text-align:right;">${p.reference}</td>
            </tr>
            <tr style="border-bottom:1px solid #1f1f38;">
              <td style="padding:10px 0;color:#555;">Network</td>
              <td style="padding:10px 0;color:#bbb;text-align:right;">Base Sepolia</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#555;">Expires in</td>
              <td style="padding:10px 0;color:#f59e0b;text-align:right;">7 days</td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 28px 28px;text-align:center;">
          <a href="${p.claimUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:16px 48px;border-radius:12px;font-weight:700;font-size:17px;letter-spacing:-0.3px;">
            Claim Your ETH →
          </a>
          <p style="margin:12px 0 0;color:#444;font-size:11px;">
            Or copy this link: <a href="${p.claimUrl}" style="color:#6d6daf;">${p.claimUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 28px;text-align:center;color:#333;font-size:11px;border-top:1px solid #1a1a30;">
          HFI Pay PoV · Secured by smart contract escrow · Do not reply to this email.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildClaimHtml(p: ClaimEmailParams): string {
  const basescanUrl = `https://sepolia.basescan.org/tx/${p.txHash}`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Payment Claimed - HFI Pay</title></head>
<body style="margin:0;padding:0;background:#07070f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111121;border-radius:20px;overflow:hidden;border:1px solid #1f1f38;">
        <tr><td style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:32px;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">✅</div>
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">Payment Claimed</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="color:#9090b0;font-size:14px;margin:0 0 20px;line-height:1.6;">
            <strong style="color:#d0d0e8;">${p.recipientName}</strong> has claimed your payment of
            <strong style="color:#34d399;">${p.amount} ETH</strong>. The funds have been released from escrow.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
            <tr style="border-bottom:1px solid #1f1f38;">
              <td style="padding:10px 0;color:#555;">Reference</td>
              <td style="padding:10px 0;color:#bbb;font-family:monospace;text-align:right;">${p.reference}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#555;">Transaction</td>
              <td style="padding:10px 0;text-align:right;">
                <a href="${basescanUrl}" style="color:#7c3aed;font-size:12px;">View on Basescan →</a>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 28px;text-align:center;color:#333;font-size:11px;border-top:1px solid #1a1a30;">
          HFI Pay PoV · Do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildRefundReminderHtml(p: RefundReminderEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Refund Available - HFI Pay</title></head>
<body style="margin:0;padding:0;background:#07070f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111121;border-radius:20px;overflow:hidden;border:1px solid #1f1f38;">
        <tr><td style="background:linear-gradient(135deg,#d97706 0%,#b45309 100%);padding:32px;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">↩️</div>
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">Refund Available</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="color:#9090b0;font-size:14px;margin:0 0 20px;line-height:1.6;">
            Hello <strong style="color:#d0d0e8;">${p.senderName}</strong>,<br/><br/>
            Your payment of <strong style="color:#fbbf24;">${p.amount} ETH</strong> to <strong style="color:#d0d0e8;">${p.recipientEmail}</strong> has been in escrow for over 7 days and remains unclaimed.
          </p>
          <p style="color:#9090b0;font-size:14px;margin:0 0 20px;line-height:1.6;">
            The escrow lock has now expired. You can log into your dashboard and manually refund the ETH back to your wallet.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;margin-bottom:20px;">
            <tr style="border-bottom:1px solid #1f1f38;">
              <td style="padding:10px 0;color:#555;">Reference</td>
              <td style="padding:10px 0;color:#bbb;font-family:monospace;text-align:right;">${p.reference}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#555;">Amount to refund</td>
              <td style="padding:10px 0;color:#fbbf24;font-weight:bold;text-align:right;">${p.amount} ETH</td>
            </tr>
          </table>
          <div style="text-align:center;">
            <a href="https://hfipay.demo/dashboard" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:700;font-size:15px;">
              Go to Dashboard
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 28px;text-align:center;color:#333;font-size:11px;border-top:1px solid #1a1a30;">
          HFI Pay PoV · Do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function testSendEmail(
  recipient: string = "yumustyology@gmail.com"
): Promise<{ success: boolean; error?: string }> {
  if (!isConfigured()) {
    console.warn("[Brevo] BREVO_API_KEY not set - skipping test email.");
    return { success: false, error: "BREVO_API_KEY not configured" };
  }

  const fromEmail = process.env.BREVO_SENDER_EMAIL ?? "noreply@hfipay.demo";
  const fromName = process.env.BREVO_SENDER_NAME ?? "HFI Pay";

  try {
    await getClient().transactionalEmails.sendTransacEmail({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: recipient, name: "Test Recipient" }],
      subject: `🧪 HFI Pay - Brevo Email Test`,
      htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Brevo Email Test</title>
</head>
<body style="margin:0;padding:0;background:#07070f;font-family:'Segoe UI',Arial,sans-serif;color:#d0d0e8;padding:40px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#111121;border-radius:20px;overflow:hidden;border:1px solid #1f1f38;padding:32px;">
    <h1 style="color:#a78bfa;margin-top:0;">HFI Pay Test Email</h1>
    <p>Hello,</p>
    <p>This is a test email sent from HFI Pay using the Brevo transactional email API.</p>
    <p>If you received this, your Brevo API credentials and configurations are set up and working correctly! 🚀</p>
    <p style="margin-top:30px;font-size:12px;color:#555;">HFI Pay PoV</p>
  </div>
</body>
</html>`,
    });

    console.log(`[Brevo] Test email sent → ${recipient}`);
    return { success: true };
  } catch (err: any) {
    const msg = err?.message ?? "Unknown Brevo error";
    console.error("[Brevo] testSendEmail failed:", msg);
    return { success: false, error: msg };
  }
}

