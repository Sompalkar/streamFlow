import nodemailer, { type Transporter } from "nodemailer"

export class EmailService {
  private transporter: Transporter

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    const emailProvider = process.env.EMAIL_PROVIDER || "smtp"

    if (emailProvider === "sendgrid") {
      this.transporter = nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: "apikey",
          pass: process.env.SENDGRID_API_KEY,
        },
      })
    } else if (emailProvider === "gmail") {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      })
    } else {
      // SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "localhost",
        port: Number.parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    }
  }

  async sendInvitation(data: {
    to: string
    sessionTitle: string
    sessionId: string
    inviterName: string
    joinUrl: string
  }) {
    const { to, sessionTitle, sessionId, inviterName, joinUrl } = data

    const mailOptions = {
      from: process.env.FROM_EMAIL || "noreply@recordingstudio.com",
      to,
      subject: `Invitation to join "${sessionTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You're invited to join a recording session!</h2>
          <p><strong>${inviterName}</strong> has invited you to join the recording session:</p>
          <h3>"${sessionTitle}"</h3>
          <p>Click the button below to join the session:</p>
          <a href="${joinUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Join Session
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p><a href="${joinUrl}">${joinUrl}</a></p>
          <p>Best regards,<br>Recording Studio Team</p>
        </div>
      `,
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log(`✅ Invitation email sent to ${to}`)
      return true
    } catch (error) {
      console.error("❌ Failed to send invitation email:", error)
      throw new Error("Failed to send invitation email")
    }
  }

  async sendWelcomeEmail(to: string, name: string) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || "noreply@recordingstudio.com",
      to,
      subject: "Welcome to Recording Studio!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Recording Studio, ${name}!</h2>
          <p>Thank you for joining our platform. You can now create and join recording sessions.</p>
          <p>Get started by creating your first session or joining an existing one.</p>
          <p>Best regards,<br>Recording Studio Team</p>
        </div>
      `,
    }

    try {
      await this.transporter.sendMail(mailOptions)
      return true
    } catch (error) {
      console.error("Failed to send welcome email:", error)
      return false
    }
  }
}
