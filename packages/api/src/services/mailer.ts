import nodemailer from 'nodemailer';
import { env } from '../config/env';

function resolveSecureSetting(port: number): boolean {
  if (typeof env.smtpSecure === 'boolean') return env.smtpSecure;
  return port === 465;
}

export function isMailerConfigured(): boolean {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass && env.smtpFrom);
}

export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<void> {
  if (!isMailerConfigured()) {
    throw new Error('SMTP settings are not configured');
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: resolveSecureSetting(env.smtpPort),
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });

  await transporter.sendMail({
    from: env.smtpFrom,
    to: toEmail,
    subject: 'Your Gradwalk OTP Code',
    text: `Your OTP code is ${otpCode}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.5; color:#0f172a;">
        <h2 style="margin:0 0 10px;">Gradwalk Verification Code</h2>
        <p style="margin:0 0 10px;">Use this OTP to verify your account:</p>
        <p style="margin:0 0 14px; font-size:24px; font-weight:700; letter-spacing:2px;">${otpCode}</p>
        <p style="margin:0; color:#475569;">This code expires in 10 minutes.</p>
      </div>
    `
  });
}
