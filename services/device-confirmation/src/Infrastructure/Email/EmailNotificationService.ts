import sgMail from "@sendgrid/mail";
import { InvocationContext } from "@azure/functions";
import { environment } from "../Config/environment";

/**
 * Email Notification Service using SendGrid
 * Sends email notifications for device collection and return confirmations
 */
export class EmailNotificationService {
  private initialized = false;

  constructor() {
    const apiKey = environment.SENDGRID_API_KEY;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.initialized = true;
    }
  }

  /**
   * Send device collection confirmation email to student
   */
  async sendCollectionConfirmationEmail(
    studentEmail: string,
    studentName: string,
    deviceName: string,
    dueDate: string,
    context?: InvocationContext
  ): Promise<void> {
    if (!this.initialized) {
      context?.warn("⚠️ SendGrid not initialized - skipping email notification");
      return;
    }

    try {
      const msg = {
        to: studentEmail,
        from: environment.SENDGRID_FROM_EMAIL || "noreply@devicelending.com",
        subject: `Device Collection Confirmed - ${deviceName}`,
        text: this.getCollectionEmailText(studentName, deviceName, dueDate),
        html: this.getCollectionEmailHtml(studentName, deviceName, dueDate),
      };

      await sgMail.send(msg);
      context?.log(`📧 Collection confirmation email sent to ${studentEmail}`);
    } catch (error: any) {
      context?.error(`❌ Failed to send collection email: ${error.message}`);
      // Don't throw - email failure shouldn't block the confirmation process
    }
  }

  /**
   * Send device return confirmation email to student
   */
  async sendReturnConfirmationEmail(
    studentEmail: string,
    studentName: string,
    deviceName: string,
    returnDate: string,
    context?: InvocationContext
  ): Promise<void> {
    if (!this.initialized) {
      context?.warn("⚠️ SendGrid not initialized - skipping email notification");
      return;
    }

    try {
      const msg = {
        to: studentEmail,
        from: environment.SENDGRID_FROM_EMAIL || "noreply@devicelending.com",
        subject: `Device Return Confirmed - ${deviceName}`,
        text: this.getReturnEmailText(studentName, deviceName, returnDate),
        html: this.getReturnEmailHtml(studentName, deviceName, returnDate),
      };

      await sgMail.send(msg);
      context?.log(`📧 Return confirmation email sent to ${studentEmail}`);
    } catch (error: any) {
      context?.error(`❌ Failed to send return email: ${error.message}`);
      // Don't throw - email failure shouldn't block the confirmation process
    }
  }

  /**
   * Send overdue device reminder email to student
   */
  async sendOverdueReminderEmail(
    studentEmail: string,
    studentName: string,
    deviceName: string,
    dueDate: string,
    daysOverdue: number,
    context?: InvocationContext
  ): Promise<void> {
    if (!this.initialized) {
      context?.warn("⚠️ SendGrid not initialized - skipping email notification");
      return;
    }

    try {
      const msg = {
        to: studentEmail,
        from: environment.SENDGRID_FROM_EMAIL || "noreply@devicelending.com",
        subject: `⚠️ Device Overdue - ${deviceName}`,
        text: this.getOverdueEmailText(studentName, deviceName, dueDate, daysOverdue),
        html: this.getOverdueEmailHtml(studentName, deviceName, dueDate, daysOverdue),
      };

      await sgMail.send(msg);
      context?.log(`📧 Overdue reminder email sent to ${studentEmail}`);
    } catch (error: any) {
      context?.error(`❌ Failed to send overdue email: ${error.message}`);
    }
  }

  // ============================================
  // Email Template Methods
  // ============================================

  private getCollectionEmailText(studentName: string, deviceName: string, dueDate: string): string {
    return `
Hello ${studentName},

This email confirms that you have successfully collected your device:

Device: ${deviceName}
Due Date: ${new Date(dueDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Please remember to return the device by the due date to avoid late fees.

Take good care of the device and contact us if you have any issues.

Best regards,
Campus Device Lending Team
    `.trim();
  }

  private getCollectionEmailHtml(studentName: string, deviceName: string, dueDate: string): string {
    const formattedDate = new Date(dueDate).toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
            .device-info { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✅ Device Collection Confirmed</h2>
            </div>
            <div class="content">
              <p>Hello <strong>${studentName}</strong>,</p>
              
              <p>This email confirms that you have successfully collected your device.</p>
              
              <div class="device-info">
                <p><strong>Device:</strong> ${deviceName}</p>
                <p><strong>Due Date:</strong> ${formattedDate}</p>
              </div>
              
              <p><strong>Important Reminders:</strong></p>
              <ul>
                <li>Please return the device by the due date to avoid late fees</li>
                <li>Take good care of the device</li>
                <li>Contact us immediately if you encounter any issues</li>
              </ul>
              
              <p>Thank you for using our device lending service!</p>
              
              <p>Best regards,<br>
              <strong>Campus Device Lending Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getReturnEmailText(studentName: string, deviceName: string, returnDate: string): string {
    return `
Hello ${studentName},

Thank you for returning your device!

Device: ${deviceName}
Return Date: ${new Date(returnDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Your device return has been confirmed and processed. We hope the device served you well.

Feel free to borrow devices again in the future!

Best regards,
Campus Device Lending Team
    `.trim();
  }

  private getReturnEmailHtml(studentName: string, deviceName: string, returnDate: string): string {
    const formattedDate = new Date(returnDate).toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
            .device-info { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2196F3; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✅ Device Return Confirmed</h2>
            </div>
            <div class="content">
              <p>Hello <strong>${studentName}</strong>,</p>
              
              <p>Thank you for returning your device! Your return has been confirmed and processed.</p>
              
              <div class="device-info">
                <p><strong>Device:</strong> ${deviceName}</p>
                <p><strong>Return Date:</strong> ${formattedDate}</p>
              </div>
              
              <p>We hope the device served you well during your loan period.</p>
              
              <p>Feel free to borrow devices again in the future!</p>
              
              <p>Best regards,<br>
              <strong>Campus Device Lending Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getOverdueEmailText(studentName: string, deviceName: string, dueDate: string, daysOverdue: number): string {
    return `
Hello ${studentName},

IMPORTANT: Your borrowed device is now overdue!

Device: ${deviceName}
Original Due Date: ${new Date(dueDate).toLocaleDateString('en-GB')}
Days Overdue: ${daysOverdue}

Please return the device as soon as possible to avoid additional late fees.

If you need an extension or are having difficulties returning the device, please contact us immediately.

Best regards,
Campus Device Lending Team
    `.trim();
  }

  private getOverdueEmailHtml(studentName: string, deviceName: string, dueDate: string, daysOverdue: number): string {
    const formattedDate = new Date(dueDate).toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
            .device-info { background-color: #ffebee; padding: 15px; margin: 20px 0; border-left: 4px solid #f44336; }
            .warning { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>⚠️ Device Overdue - Action Required</h2>
            </div>
            <div class="content">
              <p>Hello <strong>${studentName}</strong>,</p>
              
              <p><strong>IMPORTANT:</strong> Your borrowed device is now overdue!</p>
              
              <div class="device-info">
                <p><strong>Device:</strong> ${deviceName}</p>
                <p><strong>Original Due Date:</strong> ${formattedDate}</p>
                <p><strong>Days Overdue:</strong> <span style="color: #f44336; font-weight: bold;">${daysOverdue}</span></p>
              </div>
              
              <div class="warning">
                <p><strong>⚠️ Action Required:</strong></p>
                <p>Please return the device as soon as possible to avoid additional late fees.</p>
              </div>
              
              <p>If you need an extension or are having difficulties returning the device, please contact us immediately.</p>
              
              <p>Best regards,<br>
              <strong>Campus Device Lending Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
