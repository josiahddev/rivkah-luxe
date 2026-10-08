import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

let transporter: Transporter | null = null;

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function getTransporter() {
  if (!emailConfigured()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
  }
  return transporter;
}

export type Email = { to: string; subject: string; html: string; text: string; template: string; replyTo?: string };

/**
 * Send an email. Never throws — a failed email must not break checkout.
 * Every attempt is recorded in EmailLog so the owner can see what went out.
 */
export async function sendEmail(email: Email) {
  const t = getTransporter();
  if (!t) {
    console.info(`[email:not-configured] to=${email.to} subject="${email.subject}"`);
    await log(email, "NOT_CONFIGURED");
    return false;
  }
  try {
    const settings = await getSettings();
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER!;
    await t.sendMail({
      from: `"${settings.email.fromName || settings.storeName}" <${fromAddress}>`,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo || settings.businessEmail || undefined,
    });
    await log(email, "SENT");
    return true;
  } catch (err) {
    console.error("[email] failed", err);
    await log(email, "FAILED", err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function log(email: Email, status: string, error?: string) {
  try {
    await db.emailLog.create({
      data: { to: email.to, subject: email.subject, template: email.template, status, error: error?.slice(0, 500) },
    });
  } catch {
    /* logging must never throw */
  }
}
