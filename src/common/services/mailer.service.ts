import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendMail(to: string, subject: string, text: string): Promise<void> {
    const host = this.configService.get<string>('smtp.host');
    const port = this.configService.get<number>('smtp.port');
    const user = this.configService.get<string>('smtp.user');
    const pass = this.configService.get<string>('smtp.pass');
    const from = this.configService.get<string>('smtp.from');

    if (!host || !user || !pass) {
      this.logger.warn(`SMTP not configured. Email skipped for ${to}: ${subject}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text
      });
      this.logger.log(
        `SMTP sent to ${to} | messageId=${info.messageId ?? 'n/a'} | accepted=${info.accepted?.length ?? 0} | rejected=${info.rejected?.length ?? 0}`
      );
    } catch (error) {
      this.logger.error(
        `SMTP send failed for ${to}: ${(error as Error).message}`
      );
      throw error;
    }
  }
}
