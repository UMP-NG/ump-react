import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

const MAIL_TIMEOUT_MS = 15000;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Mail timed out after ${ms}ms`)), ms)
    ),
  ]);

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildContent = (options) => {
  let subject = options.subject || "UMP Notification";
  let htmlContent = "";
  let textContent = "";

  if (options.type === "otp") {
    subject = "Your UMP OTP Verification Code";
    textContent = `UMP OTP Verification\nHello, use the OTP below to verify your email:\nYour OTP is: ${options.otp}\nThis OTP is valid for 10 minutes.\n- UMP Support`;
    htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>UMP OTP Verification</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, Helvetica, sans-serif; }
    .wrapper { width: 100%; padding: 30px 10px; }
    .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 28px; border: 1px solid #e6e9ee; }
    h2 { margin: 0 0 12px; color: #222222; font-size: 20px; }
    p { margin: 8px 0; color: #555555; font-size: 14px; line-height: 1.6; }
    .otp-box { margin: 24px 0; text-align: center; background-color: #f0f6ff; border: 1px dashed #c6dcff; border-radius: 8px; padding: 16px; font-size: 26px; font-weight: bold; letter-spacing: 4px; color: #1a5cff; }
    .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #999999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <h2>UMP Email Verification</h2>
      <p>Hello,</p>
      <p>Please use the one-time password (OTP) below to verify your email address.</p>
      <div class="otp-box">${options.otp}</div>
      <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
      <p>— UMP Support Team</p>
      <div class="footer">© ${new Date().getFullYear()} UMP. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
  } else if (options.type === "reset") {
    subject = "Reset Your UMP Password";
    textContent = `UMP Password Reset\nHello, you requested a password reset.\nClick the link below:\n${options.resetUrl}\nThis link expires in 10 minutes.\n- UMP Support`;
    htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Reset Your Password</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, Helvetica, sans-serif; }
    .wrapper { width: 100%; padding: 30px 10px; }
    .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 28px; border: 1px solid #e6e9ee; }
    h2 { margin: 0 0 12px; color: #222222; font-size: 20px; }
    p { margin: 8px 0; color: #555555; font-size: 14px; line-height: 1.6; }
    .button-wrapper { text-align: center; margin: 26px 0; }
    .button { display: inline-block; background-color: #1a5cff; color: #ffffff !important; text-decoration: none; padding: 12px 22px; border-radius: 6px; font-size: 14px; font-weight: bold; }
    .footer { margin-top: 26px; text-align: center; font-size: 12px; color: #999999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <h2>Password Reset Request</h2>
      <p>Hello,</p>
      <p>You requested to reset the password for your UMP account.</p>
      <p>Click the button below to continue:</p>
      <div class="button-wrapper">
        <a href="${escapeHtml(options.resetUrl)}" target="_blank" class="button">Reset Password</a>
      </div>
      <p>This link will expire in <strong>10 minutes</strong>. If you did not request this, ignore this email.</p>
      <p>— UMP Support Team</p>
      <div class="footer">© ${new Date().getFullYear()} UMP. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
  } else {
    subject = options.subject || "Message from UMP";
    const msg = options.message || "Hello from UMP!";
    textContent = msg;
    htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><style>body{font-family:Arial,sans-serif;padding:30px;background-color:#f4f4f4;}.content{background:#fff;padding:20px;border-radius:10px;}</style></head><body><div class="content"><p>${escapeHtml(msg)}</p></div></body></html>`;
  }

  return { subject, htmlContent, textContent };
};

const sendViaSendGrid = async ({ to, from, subject, html, text }) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  await withTimeout(
    sgMail.send({ to, from, subject, html, text }),
    MAIL_TIMEOUT_MS
  );
  return { messageId: `sendgrid-${Date.now()}` };
};

const sendViaZoho = async (mailOptions) => {
  const transporter = nodemailer.createTransport({
    host: "smtppro.zoho.com",
    port: 587,
    secure: false,
    requireTLS: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: {
      user: process.env.ZOHO_SMTP_USER,
      pass: process.env.ZOHO_SMTP_PASS,
    },
  });
  return withTimeout(transporter.sendMail(mailOptions), MAIL_TIMEOUT_MS);
};

const sendMail = async (options) => {
  if (!options.email) {
    throw new Error("Recipient email is required");
  }

  const hasSendGrid = !!process.env.SENDGRID_API_KEY;
  const hasZoho = !!(process.env.ZOHO_SMTP_USER && process.env.ZOHO_SMTP_PASS);

  if (!hasSendGrid && !hasZoho) {
    console.warn(`⚠️  [MAIL] No mail credentials configured — skipping email`);
    return { skipped: true };
  }

  const maskedEmail = options.email.replace(/(?<=.{2}).(?=[^@]*@)/g, "*");
  const { subject, htmlContent, textContent } = buildContent(options);

  const FROM_SG   = process.env.SENDGRID_FROM_EMAIL || "admin@myump.com.ng";
  const FROM_ZOHO = `"UMP Official" <${process.env.ZOHO_SMTP_USER}>`;

  const errors = [];

  // 1️⃣ SendGrid — primary
  if (hasSendGrid) {
    try {
      console.log(`📧 [MAIL] Sending via SendGrid to ${maskedEmail}`);
      const info = await sendViaSendGrid({ to: options.email, from: FROM_SG, subject, html: htmlContent, text: textContent });
      console.log(`✅ [MAIL] Sent via SendGrid to ${maskedEmail}`);
      return info;
    } catch (err) {
      console.warn(`⚠️  [MAIL] SendGrid failed: ${err.message}`);
      errors.push(`SendGrid: ${err.message}`);
    }
  }

  // 2️⃣ Zoho SMTP — fallback (port 587 STARTTLS)
  if (hasZoho) {
    try {
      console.log(`📧 [MAIL] Falling back to Zoho for ${maskedEmail}`);
      const info = await sendViaZoho({ from: FROM_ZOHO, to: options.email, subject, text: textContent, html: htmlContent });
      console.log(`✅ [MAIL] Sent via Zoho to ${maskedEmail}`);
      return info;
    } catch (err) {
      console.warn(`⚠️  [MAIL] Zoho failed: ${err.message}`);
      errors.push(`Zoho: ${err.message}`);
    }
  }

  throw new Error(`Email delivery failed — ${errors.join(" | ")}`);
};

export default sendMail;

