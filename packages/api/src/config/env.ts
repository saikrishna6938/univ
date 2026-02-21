import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  mysqlHost: process.env.MYSQL_HOST || "127.0.0.1",
  mysqlPort: Number(process.env.MYSQL_PORT) || 3306,
  mysqlUser: process.env.MYSQL_USER || "root",
  mysqlPassword: process.env.MYSQL_PASSWORD || "",
  mysqlDatabase: process.env.MYSQL_DATABASE || "univ",
  requestToken: process.env.CURRENT_URL_TOKEN_REQUEST || "",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT) || 25,
  smtpSecure:
    process.env.SMTP_SECURE === "true"
      ? true
      : process.env.SMTP_SECURE === "false"
        ? false
        : undefined,
  smtpUser: process.env.SMTP_USER || process.env.EMAIL_FROM || "",
  smtpPass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || "",
  smtpFrom: process.env.SMTP_FROM || process.env.EMAIL_FROM || "",
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
