import sendBrevoEmail from "../config/brevo.js";

const sendPasswordResetOTP = async (recipientEmail, otp) => {
  const subject = "Password Reset OTP - Riyaz Telecom";

  const textContent = `
Your Riyaz Telecom password reset verification code is: ${otp}

This OTP expires in 5 minutes.

If you did not request a password reset, please ignore this email.
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0; padding:24px; font-family:Arial,sans-serif; color:#222;">
        <div style="max-width:500px; margin:auto;">
          <h2 style="color:#387ef7;">Riyaz Telecom</h2>

          <h3>Password Reset Verification</h3>

          <p>
            We received a request to reset your password.
            Use the verification code below:
          </p>

          <div style="
            margin:24px 0;
            padding:20px;
            background:#f3f4f6;
            border-radius:8px;
            text-align:center;
            font-size:30px;
            font-weight:bold;
            letter-spacing:8px;
          ">
            ${otp}
          </div>

          <p>This code expires in <strong>5 minutes</strong>.</p>

          <p>
            If you did not request this password reset,
            you can safely ignore this email.
          </p>

          <p>Regards,<br />Riyaz Telecom Team</p>
        </div>
      </body>
    </html>
  `;

  return sendBrevoEmail({
    recipientEmail,
    subject,
    htmlContent,
    textContent,
  });
};

export default sendPasswordResetOTP;