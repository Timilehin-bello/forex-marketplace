import { Injectable } from '@nestjs/common';
import { LoggerService } from '@forex-marketplace/shared-utils';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly logger: LoggerService) {
    // For production, use real SMTP configuration
    // For development/testing, use Ethereal (fake SMTP)
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    if (process.env['NODE_ENV'] === 'production') {
      this.transporter = nodemailer.createTransport({
        host: process.env['SMTP_HOST'],
        port: parseInt(process.env['SMTP_PORT'] || '587', 10),
        secure: process.env['SMTP_SECURE'] === 'true',
        auth: {
          user: process.env['SMTP_USER'],
          pass: process.env['SMTP_PASSWORD'],
        },
      });
    } else {
      // Create a test account at ethereal.email for development
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from:
          process.env['EMAIL_FROM'] ||
          '"Forex Platform" <noreply@forex-platform.com>',
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent: ${info.messageId}`);

      // Log the URL for Ethereal in development
      if (process.env['NODE_ENV'] !== 'production') {
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  createTransactionEmailContent(
    type: string,
    amount: number,
    currency: string
  ): string {
    const action = type === 'CREDIT' ? 'received' : 'sent';
    return `
      <h1>Transaction Notification</h1>
      <p>You have ${action} ${amount} ${currency}.</p>
      <p>Thank you for using our platform!</p>
    `;
  }

  createOrderEmailContent(
    type: string,
    status: string,
    fromCurrency: string,
    toCurrency: string,
    fromAmount: number,
    toAmount: number
  ): string {
    return `
      <h1>Order Notification</h1>
      <p>Your ${type} order for converting ${fromAmount} ${fromCurrency} to ${toAmount} ${toCurrency} has been ${status.toLowerCase()}.</p>
      <p>Thank you for using our platform!</p>
    `;
  }

  createWalletEmailContent(currency: string, action: string): string {
    return `
      <h1>Wallet Notification</h1>
      <p>Your ${currency} wallet has been ${action.toLowerCase()}.</p>
      <p>Thank you for using our platform!</p>
    `;
  }
}
