import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends email through whichever SMTP provider is configured (SMTP_* env vars).
 * Kept deliberately small: one method, no templates engine, no provider SDK.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  private readonly transporter: Transporter | null;
  private readonly from: string | null;

  constructor(config: ConfigService) {
    const host = config.get<string | null>('mail.host');
    this.from = config.get<string | null>('mail.from') ?? null;
    this.transporter =
      host && this.from
        ? createTransport({
            host,
            port: config.get<number>('mail.port'),
            secure: config.get<boolean>('mail.secure'),
            auth: config.get('mail.user') ? { user: config.get<string>('mail.user'), pass: config.get<string>('mail.pass') } : undefined,
          })
        : null;
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) throw new Error('Email is not configured');
    await this.transporter.sendMail({ from: this.from!, ...message });
    this.logger.log(`Sent "${message.subject}"`);
  }
}
