/**
 * Email Service
 * Handles sending emails for invitations, notifications, and alerts
 */

import nodemailer from "nodemailer"

interface InvitationData {
  to: string
  sessionTitle: string
  hostName: string
  inviteLink: string
  scheduledTime?: Date
}

interface RecordingCompleteData {
  to: string
  sessionTitle: string
  recordingCount: number
  duration: number
  dashboardLink: string
}

class EmailService {
  private transporter: nodemailer.Transporter
  private initialized = false

  constructor() {
    this.initialize()
  }

  /**
   * Initialize email service
   */
  private async initialize() {
    try {
      // Configure email transporter based on environment
      if (process.env.NODE_ENV === "production") {
        // Production: Use a real email service (SendGrid, AWS SES, etc.)
        this.transporter = nodemailer.createTransporter({
          service: "SendGrid",
          auth: {
            user: process.env.SENDGRID_USERNAME,
            pass: process.env.SENDGRID_PASSWORD,
          },
        })
      } else {
        // Development: Use Ethereal Email for testing
        const testAccount = await nodemailer.createTestAccount()
        this.transporter = nodemailer.createTransporter({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        })
      }

      this.initialized = true
      console.log("✅ Email service initialized")
    } catch (error) {
      console.error("❌ Email service initialization failed:", error)
      this.initialized = false
    }
  }

  /**
   * Check if email service is available
   */
  isAvailable(): boolean {
    return this.initialized && !!this.transporter
  }

  /**
   * Send session invitation email
   */
  async sendInvitation(data: InvitationData): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn("Email service not available, skipping invitation email")
      return false
    }

    try {
      const scheduledText = data.scheduledTime ? `\n\nScheduled for: ${data.scheduledTime.toLocaleString()}` : ""

      const mailOptions = {
        from: process.env.FROM_EMAIL || "noreply@studioflow.com",
        to: data.to,
        subject: `Invitation to join "${data.sessionTitle}" recording session`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">StudioFlow</h1>
              <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Professional Recording Platform</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">You're invited to join a recording session!</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                <h3 style="margin: 0 0 10px 0; color: #333;">Session: ${data.sessionTitle}</h3>
                <p style="margin: 0; color: #666;">Hosted by: ${data.hostName}</p>
                ${scheduledText}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.inviteLink}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold;
                          display: inline-block;">
                  Join Recording Session
                </a>
              </div>
              
              <div style="background: #e9ecef; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">What you'll need:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #666;">
                  <li>A modern web browser (Chrome, Firefox, Safari, or Edge)</li>
                  <li>Camera and microphone access</li>
                  <li>Stable internet connection</li>
                </ul>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                If you can't click the button above, copy and paste this link into your browser:<br>
                <a href="${data.inviteLink}" style="color: #667eea;">${data.inviteLink}</a>
              </p>
            </div>
            
            <div style="background: #333; padding: 20px; text-align: center;">
              <p style="color: #ccc; margin: 0; font-size: 14px;">
                © 2024 StudioFlow. All rights reserved.
              </p>
            </div>
          </div>
        `,
        text: `
You're invited to join a recording session!

Session: ${data.sessionTitle}
Hosted by: ${data.hostName}${scheduledText}

Join the session: ${data.inviteLink}

What you'll need:
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Camera and microphone access
- Stable internet connection

© 2024 StudioFlow. All rights reserved.
        `,
      }

      const info = await this.transporter.sendMail(mailOptions)

      if (process.env.NODE_ENV !== "production") {
        console.log("📧 Invitation email sent:", nodemailer.getTestMessageUrl(info))
      }

      return true
    } catch (error) {
      console.error("Failed to send invitation email:", error)
      return false
    }
  }

  /**
   * Send recording completion notification
   */
  async sendRecordingComplete(data: RecordingCompleteData): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn("Email service not available, skipping completion email")
      return false
    }

    try {
      const durationText = this.formatDuration(data.duration)

      const mailOptions = {
        from: process.env.FROM_EMAIL || "noreply@studioflow.com",
        to: data.to,
        subject: `Recording completed: "${data.sessionTitle}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">StudioFlow</h1>
              <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Recording Complete!</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Your recording is ready! 🎉</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #333;">${data.sessionTitle}</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #666;">Recordings:</span>
                  <strong style="color: #333;">${data.recordingCount}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666;">Duration:</span>
                  <strong style="color: #333;">${durationText}</strong>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.dashboardLink}" 
                   style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold;
                          display: inline-block;">
                  View Recordings
                </a>
              </div>
              
              <div style="background: #e9ecef; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">What's next?</h4>
                <ul style="margin: 0; padding-left: 20px; color: #666;">
                  <li>Download your recordings in high quality</li>
                  <li>View AI-generated transcriptions (if enabled)</li>
                  <li>Share recordings with participants</li>
                  <li>Organize recordings in your dashboard</li>
                </ul>
              </div>
            </div>
            
            <div style="background: #333; padding: 20px; text-align: center;">
              <p style="color: #ccc; margin: 0; font-size: 14px;">
                © 2024 StudioFlow. All rights reserved.
              </p>
            </div>
          </div>
        `,
        text: `
Your recording is ready!

Session: ${data.sessionTitle}
Recordings: ${data.recordingCount}
Duration: ${durationText}

View your recordings: ${data.dashboardLink}

What's next?
- Download your recordings in high quality
- View AI-generated transcriptions (if enabled)
- Share recordings with participants
- Organize recordings in your dashboard

© 2024 StudioFlow. All rights reserved.
        `,
      }

      const info = await this.transporter.sendMail(mailOptions)

      if (process.env.NODE_ENV !== "production") {
        console.log("📧 Completion email sent:", nodemailer.getTestMessageUrl(info))
      }

      return true
    } catch (error) {
      console.error("Failed to send completion email:", error)
      return false
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, resetLink: string): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn("Email service not available, skipping password reset email")
      return false
    }

    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || "noreply@studioflow.com",
        to,
        subject: "Reset your StudioFlow password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">StudioFlow</h1>
              <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Password Reset</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Reset your password</h2>
              
              <p style="color: #666; margin-bottom: 20px;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold;
                          display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404;">
                  <strong>Security note:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                If you can't click the button above, copy and paste this link into your browser:<br>
                <a href="${resetLink}" style="color: #667eea;">${resetLink}</a>
              </p>
            </div>
            
            <div style="background: #333; padding: 20px; text-align: center;">
              <p style="color: #ccc; margin: 0; font-size: 14px;">
                © 2024 StudioFlow. All rights reserved.
              </p>
            </div>
          </div>
        `,
        text: `
Reset your StudioFlow password

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

Security note: This link will expire in 1 hour. If you didn't request this reset, please ignore this email.

© 2024 StudioFlow. All rights reserved.
        `,
      }

      const info = await this.transporter.sendMail(mailOptions)

      if (process.env.NODE_ENV !== "production") {
        console.log("📧 Password reset email sent:", nodemailer.getTestMessageUrl(info))
      }

      return true
    } catch (error) {
      console.error("Failed to send password reset email:", error)
      return false
    }
  }

  /**
   * Format duration in seconds to human readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${remainingSeconds}s`
    }
  }

  /**
   * Cleanup service resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.transporter) {
        this.transporter.close()
      }
      console.log("✅ Email service cleaned up")
    } catch (error) {
      console.error("❌ Email service cleanup error:", error)
    }
  }
}

export const emailService = new EmailService()
