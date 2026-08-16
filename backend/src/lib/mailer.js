import "dotenv/config";

const APP_NAME = process.env.APP_NAME || "TalkHub";
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || APP_NAME;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

if (!BREVO_API_KEY) {
  console.error("❌ BREVO_API_KEY missing in .env");
} else if (!EMAIL_FROM) {
  console.error("❌ EMAIL_FROM missing in .env");
} else {
  console.log("✅ Brevo mailer ready (HTTP API)");
}

export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const otpEmailTemplate = (otp, purpose) => {
  const titles = {
    signup: "Verify your email",
    login: "Your login code",
    "reset-password": "Reset your password",
  };
  const messages = {
    signup: "Welcome! Use the code below to verify your email and complete signup.",
    login: "Use the code below to sign in to your account.",
    "reset-password": "Use the code below to reset your password.",
  };

  return `
  <!DOCTYPE html>
  <html>
    <body style="margin:0; padding:0; background:#f4f4f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
        <div style="background:white; border-radius:16px; padding:40px; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <div style="text-align:center; margin-bottom:30px;">
            <h1 style="color:#8b5cf6; font-size:32px; margin:0; font-weight:800;">${APP_NAME}</h1>
          </div>
          <h2 style="color:#1f2937; font-size:22px; margin-bottom:12px;">${titles[purpose]}</h2>
          <p style="color:#6b7280; font-size:15px; line-height:1.6;">${messages[purpose]}</p>
          <div style="background:linear-gradient(135deg,#8b5cf6,#3b82f6); border-radius:12px; padding:24px; text-align:center; margin:30px 0;">
            <div style="color:white; opacity:0.9; font-size:12px; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px;">Your OTP Code</div>
            <div style="color:white; font-size:42px; font-weight:bold; letter-spacing:8px; font-family:'Courier New',monospace;">${otp}</div>
          </div>
          <p style="color:#6b7280; font-size:13px; line-height:1.6;">
            ⏱ This code expires in <strong>5 minutes</strong>.<br>
            🔒 If you didn't request this, please ignore this email.
          </p>
          <hr style="border:none; border-top:1px solid #e5e7eb; margin:30px 0;">
          <p style="color:#9ca3af; font-size:12px; text-align:center; margin:0;">
            &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
  </html>`;
};

export const sendOtpEmail = async ({ to, otp, purpose }) => {
  const subjects = {
    signup: `${APP_NAME} - Verify your email (${otp})`,
    login: `${APP_NAME} - Your login code (${otp})`,
    "reset-password": `${APP_NAME} - Reset password (${otp})`,
  };

  const body = {
    sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM },
    to: [{ email: to }],
    subject: subjects[purpose],
    htmlContent: otpEmailTemplate(otp, purpose),
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Brevo API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log(`📧 OTP sent to ${to} for ${purpose} (id: ${data.messageId})`);
    return data;
  } catch (err) {
    console.error("❌ sendOtpEmail failed:", err.message);
    throw err;
  }
};