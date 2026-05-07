import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface DigestJobLine {
  title: string;
  company: string;
  location: string;
  url: string;
  postedAt: Date;
  score: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }
    const host =
      this.configService.get<string>('SMTP_HOST') ?? 'sandbox.smtp.mailtrap.io';
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 2525);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    if (!user || !pass) {
      throw new Error(
        'SMTP_USER and SMTP_PASS must be set to send email (use Mailtrap credentials locally)',
      );
    }
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return this.transporter;
  }

  async sendDigest(params: {
    to: string;
    jobs: DigestJobLine[];
    unsubscribeUrl: string;
  }): Promise<{ messageId?: string; response?: string }> {
    const from =
      this.configService.get<string>('EMAIL_FROM') ??
      'JobRadar <noreply@jobradar.local>';
    const n = params.jobs.length;
    const subject = `${n} new job${n === 1 ? '' : 's'} for your JobRadar filter`;

    const textLines = params.jobs.map(
      (j, i) =>
        `${i + 1}. ${j.title} @ ${j.company}\n   Location: ${j.location}\n   Score: ${j.score}\n   Posted: ${j.postedAt.toISOString()}\n   ${j.url}`,
    );
    const text = [
      `You have ${n} new job${n === 1 ? '' : 's'}:`,
      '',
      ...textLines,
      '',
      `Unsubscribe from alert emails: ${params.unsubscribeUrl}`,
    ].join('\n');

    const htmlCards = params.jobs
      .map(
        (j, i) => `<tr>
  <td style="padding:0 24px 12px 24px">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:12px;background:#ffffff">
      <tr>
        <td style="padding:16px 16px 10px 16px;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.4">
          Job ${i + 1} · Score ${j.score}
        </td>
      </tr>
      <tr>
        <td style="padding:0 16px 8px 16px;font-family:Arial,sans-serif;font-size:18px;color:#111827;line-height:1.35;font-weight:700">
          ${escapeHtml(j.title)}
        </td>
      </tr>
      <tr>
        <td style="padding:0 16px 12px 16px;font-family:Arial,sans-serif;font-size:14px;color:#4b5563;line-height:1.5">
          ${escapeHtml(j.company)} · ${escapeHtml(j.location)}<br/>
          Posted: ${escapeHtml(j.postedAt.toISOString())}
        </td>
      </tr>
      <tr>
        <td style="padding:0 16px 16px 16px">
          <a href="${escapeAttr(j.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;padding:10px 14px;border-radius:8px">
            View Job
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
      You have ${n} new job${n === 1 ? '' : 's'} waiting in JobRadar.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f3f4f6;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
            <tr>
              <td style="padding:24px 24px 8px 24px;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.4">
                JobRadar Digest
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 12px 24px;font-family:Arial,sans-serif;font-size:24px;color:#111827;line-height:1.25;font-weight:700">
                ${n} new job${n === 1 ? '' : 's'} for you
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 20px 24px;font-family:Arial,sans-serif;font-size:14px;color:#4b5563;line-height:1.6">
                We found jobs that align with your filter settings.
              </td>
            </tr>
            ${htmlCards}
            <tr>
              <td style="padding:8px 24px 8px 24px;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.5">
                You are receiving this email because alerts are enabled on your JobRadar account.
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 24px 24px;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.5">
                <a href="${escapeAttr(params.unsubscribeUrl)}" style="color:#2563eb;text-decoration:none">
                  Unsubscribe from alert emails
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const info = await this.getTransporter().sendMail({
      from,
      to: params.to,
      subject,
      text,
      html,
    });
    this.logger.log(
      `Digest sent to=${params.to} messageId=${info.messageId ?? ''}`,
    );
    return { messageId: info.messageId, response: info.response };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
