import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOTP = async (to, otp) => {
  const mailOptions = {
    from: `"CoreInventory" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Your CoreInventory Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0ea5e9; text-align: center;">CoreInventory</h2>
        <p>Hello,</p>
        <p>You requested a password reset. Use the code below to reset your password. This code is valid for 10 minutes.</p>
        <div style="background-color: #f0f9ff; padding: 20px; text-align: center; border-radius: 5px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0369a1;">${otp}</span>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};
