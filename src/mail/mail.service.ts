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
    const subject = `${n} new match${n === 1 ? '' : 'es'} for your JobRadar filter`;

    const textLines = params.jobs.map(
      (j, i) =>
        `${i + 1}. ${j.title} @ ${j.company}\n   Location: ${j.location}\n   Score: ${j.score}\n   Posted: ${j.postedAt.toISOString()}\n   ${j.url}`,
    );
    const text = [
      `You have ${n} new job match${n === 1 ? '' : 'es'}:`,
      '',
      ...textLines,
      '',
      `Unsubscribe from alert emails: ${params.unsubscribeUrl}`,
    ].join('\n');

    const htmlRows = params.jobs
      .map(
        (j, i) => `<tr>
<td style="padding:8px;border-bottom:1px solid #eee;vertical-align:top">${i + 1}</td>
<td style="padding:8px;border-bottom:1px solid #eee">
  <strong>${escapeHtml(j.title)}</strong> — ${escapeHtml(j.company)}<br/>
  <span style="color:#555">${escapeHtml(j.location)}</span> · score ${j.score}<br/>
  <small>${escapeHtml(j.postedAt.toISOString())}</small><br/>
  <a href="${escapeAttr(j.url)}">Open listing</a>
</td>
</tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif">
<p>You have <strong>${n}</strong> new job match${n === 1 ? '' : 'es'}:</p>
<table style="border-collapse:collapse;width:100%;max-width:720px">${htmlRows}</table>
<p style="margin-top:24px"><a href="${escapeAttr(params.unsubscribeUrl)}">Unsubscribe from alert emails</a></p>
</body></html>`;

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
