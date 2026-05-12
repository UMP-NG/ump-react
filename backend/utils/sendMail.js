import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

// ✅ Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendMail = async (options) => {
  if (!options.email) {
    throw new Error("Recipient email is required");
  }

  try {
    // ✅ BACKUP: Zoho transporter (fallback)
    const zohoTransporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_SMTP_USER,
        pass: process.env.ZOHO_SMTP_PASS,
      },
    });

    let subject = options.subject || "UMP Notification";
    let htmlContent = "";
    let textContent = "";

    if (options.type === "otp") {
    subject = "Your UMP OTP Verification Code";

    textContent = `
UMP OTP Verification
Hello, use the OTP below to verify your email:
Your OTP is: ${options.otp}
This OTP is valid for 10 minutes.
- UMP Support
    `;

    htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>UMP OTP Verification</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
      font-family: Arial, Helvetica, sans-serif;
    }
    .wrapper {
      width: 100%;
      padding: 30px 10px;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 10px;
      padding: 28px;
      border: 1px solid #e6e9ee;
    }
    h2 {
      margin: 0 0 12px;
      color: #222222;
      font-size: 20px;
    }
    p {
      margin: 8px 0;
      color: #555555;
      font-size: 14px;
      line-height: 1.6;
    }
    .otp-box {
      margin: 24px 0;
      text-align: center;
      background-color: #f0f6ff;
      border: 1px dashed #c6dcff;
      border-radius: 8px;
      padding: 16px;
      font-size: 26px;
      font-weight: bold;
      letter-spacing: 4px;
      color: #1a5cff;
    }
    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 12px;
      color: #999999;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <h2>UMP Email Verification</h2>

      <p>Hello 👋,</p>
      <p>Please use the one-time password (OTP) below to verify your email address.</p>

      <div class="otp-box">
        ${options.otp}
      </div>

      <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>

      <p>— UMP Support Team</p>

      <div class="footer">
        © ${new Date().getFullYear()} UMP. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
`;
    } else if (options.type === "reset") {
      subject = "Reset Your UMP Password";

      textContent = `
UMP Password Reset
Hello, you requested a password reset.
Click the link below to reset your password:
${options.resetUrl}
This link will expire in 10 minutes.
- UMP Support
      `;

      htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Reset Your Password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
      font-family: Arial, Helvetica, sans-serif;
    }
    .wrapper {
      width: 100%;
      padding: 30px 10px;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 10px;
      padding: 28px;
      border: 1px solid #e6e9ee;
    }
    h2 {
      margin: 0 0 12px;
      color: #222222;
      font-size: 20px;
    }
    p {
      margin: 8px 0;
      color: #555555;
      font-size: 14px;
      line-height: 1.6;
    }
    .button-wrapper {
      text-align: center;
      margin: 26px 0;
    }
    .button {
      display: inline-block;
      background-color: #1a5cff;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 22px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
    }
    .footer {
      margin-top: 26px;
      text-align: center;
      font-size: 12px;
      color: #999999;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <h2>Password Reset Request</h2>

      <p>Hello 👋,</p>
      <p>You requested to reset the password for your UMP account.</p>
      <p>Click the button below to continue:</p>

      <div class="button-wrapper">
        <a
          href="${options.resetUrl}"
          target="_blank"
          class="button"
        >
          Reset Password
        </a>
      </div>

      <p>
        This link will expire in <strong>10 minutes</strong>.
        If you did not request this, you can safely ignore this email.
      </p>

      <p>— UMP Support Team</p>

      <div class="footer">
        © ${new Date().getFullYear()} UMP. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
`;
    } else {
      subject = options.subject || "Message from UMP";
      htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; background-color: #f4f4f4; }
    .content { background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div class="content">
    <p>${options.message || "Hello from UMP!"}</p>
  </div>
</body>
</html>`;
    }

    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL || "admin@myump.com.ng",
      to: options.email,
      subject,
      text: textContent,
      html: htmlContent,
      // Add headers for better deliverability
      headers: {
        "X-Priority": "3",
        "X-Mailer": "SendGrid + Nodemailer",
      },
    };

    let info;

    try {
      // 🟢 Try SendGrid first (PRIMARY)
      console.log(`📧 [MAIL] Attempting to send via SendGrid to ${options.email}`);
      await sgMail.send(mailOptions);
      info = { messageId: `sendgrid-${Date.now()}` };
      console.log(`✅ [MAIL] Successfully sent via SendGrid to ${options.email}`);
      return info;
    } catch (sendGridError) {
      console.warn(`⚠️  [MAIL] SendGrid failed: ${sendGridError.message}`);

      try {
        // 🟠 Fallback to Zoho (BACKUP)
        console.log(`📧 [MAIL] Falling back to Zoho mail for ${options.email}`);
        const zohoMailOptions = {
          ...mailOptions,
          from: `"UMP Official" <${process.env.ZOHO_SMTP_USER}>`,
        };
        info = await zohoTransporter.sendMail(zohoMailOptions);
        console.log(`✅ [MAIL] Successfully sent via Zoho to ${options.email} - Message ID: ${info.messageId}`);
        return info;
      } catch (zohoError) {
        console.error(`❌ [MAIL] Both SendGrid and Zoho failed`);
        console.error(`SendGrid error: ${sendGridError.message}`);
        console.error(`Zoho error: ${zohoError.message}`);
        throw new Error(
          `Email could not be sent via SendGrid or Zoho: ${zohoError.message}`
        );
      }
    }
  } catch (error) {
    console.error("❌ [MAIL] Email service error:", error);
    throw new Error(`Email service error: ${error.message}`);
  }
};

export default sendMail;
