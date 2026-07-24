const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const isMockEmail = (email) => {
  if (!email) return false;
  const domain = email.toLowerCase().split('@')[1];
  return ['example.com', 'test.com', 'mock.com', 'localhost'].includes(domain);
};

const sendOTPEmail = async (to, otp) => {
  if (isMockEmail(to)) {
    console.log(`[MOCK EMAIL SERVICE] Intercepted mock/test address: ${to}`);
    console.log(`[MOCK EMAIL SERVICE] No SMTP sent. Generated OTP: ${otp}`);
    return { messageId: `mock-otp-${Date.now()}` };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Voltify" <${process.env.GMAIL_USER}>`,
    to,
    subject: '🔒 Verify your Voltify Account — OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ff9800; margin: 0; font-size: 28px;">⚡ Voltify</h1>
          <p style="color: #666666; margin: 4px 0 0 0; font-size: 14px;">Your Intelligent Energy Saving Companion</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin-bottom: 24px;" />
        <p style="color: #333333; font-size: 16px; line-height: 1.5;">Hi,</p>
        <p style="color: #333333; font-size: 16px; line-height: 1.5;">Thank you for creating an account on Voltify! To complete your registration and verify your email address, please use the following One-Time Password (OTP) code:</p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="display: inline-block; font-family: monospace; font-size: 36px; font-weight: bold; color: #ff9800; letter-spacing: 6px; padding: 12px 24px; background-color: #fff8e1; border-radius: 8px; border: 1px dashed #ffb74d;">${otp}</span>
        </div>
        <p style="color: #666666; font-size: 14px; line-height: 1.5;">This code is valid for <strong>5 minutes</strong>. If you did not request this code, please ignore this email or contact support.</p>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;" />
        <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} Voltify. All rights reserved.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendForgotPasswordEmail = async (to, resetLink) => {
  if (isMockEmail(to)) {
    console.log(`[MOCK EMAIL SERVICE] Intercepted mock/test address: ${to}`);
    console.log(`[MOCK EMAIL SERVICE] No SMTP sent. Password Reset Link: ${resetLink}`);
    return { messageId: `mock-reset-${Date.now()}` };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Voltify" <${process.env.GMAIL_USER}>`,
    to,
    subject: '🔑 Reset your Voltify Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ff9800; margin: 0; font-size: 28px;">⚡ Voltify</h1>
          <p style="color: #666666; margin: 4px 0 0 0; font-size: 14px;">Your Intelligent Energy Saving Companion</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin-bottom: 24px;" />
        <p style="color: #333333; font-size: 16px; line-height: 1.5;">Hi,</p>
        <p style="color: #333333; font-size: 16px; line-height: 1.5;">We received a request to reset your Voltify password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: bold; color: #ffffff; background-color: #ff9800; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 6px rgba(255, 152, 0, 0.2);">Reset Password</a>
        </div>
        <p style="color: #666666; font-size: 14px; line-height: 1.5;">If you did not request this, please ignore this email. Your password will remain safe and unchanged.</p>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;" />
        <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} Voltify. All rights reserved.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail, sendForgotPasswordEmail };
