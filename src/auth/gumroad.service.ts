import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GumroadLicenseResponse } from './interfaces/gumroad-license-response.interface';
import { GumroadVerifyResult } from './types/gumroad-verify-result';
import { User } from '../database/entities/user.entity';

@Injectable()
export class GumroadService {
  private readonly verifyEndpoint =
    'https://api.gumroad.com/v2/licenses/verify';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async verifyLicense(licenseKey: string, email: string): Promise<void> {
    const productId = this.configService.get<string>('GUMROAD_PRODUCT_ID');

    if (!productId) {
      throw new BadRequestException(
        'Server not configured: missing GUMROAD_PRODUCT_ID',
      );
    }

    const formBody = new URLSearchParams({
      product_id: productId,
      license_key: licenseKey,
      increment_uses_count: 'false',
    });

    let response: GumroadLicenseResponse;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<GumroadLicenseResponse>(
          this.verifyEndpoint,
          formBody.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 8000,
          },
        ),
      );
      response = data;
    } catch {
      throw new ServiceUnavailableException(
        'Failed to validate Gumroad license',
      );
    }

    if (!response.success || !response.purchase) {
      throw new UnauthorizedException(
        response.message ?? 'Invalid Gumroad license key',
      );
    }

    if (response.purchase.test) {
      return;
    }

    if (response.purchase.refunded || response.purchase.chargebacked) {
      throw new UnauthorizedException('License is not active');
    }

    const purchaseEmail = (response.purchase.email ?? '').trim().toLowerCase();
    if (purchaseEmail && purchaseEmail !== email.toLowerCase()) {
      throw new UnauthorizedException(
        'License key is valid but email does not match purchase',
      );
    }
  }

  /**
   * Live Gumroad verify for digest sends — does not throw; returns structured result.
   */
  async verifyLicenseForUser(user: User): Promise<GumroadVerifyResult> {
    const key = user.licenseKey?.trim();
    if (!key) {
      return { ok: false, reason: 'no_license' };
    }
    const productId = this.configService.get<string>('GUMROAD_PRODUCT_ID');
    if (!productId) {
      return { ok: false, reason: 'http' };
    }
    const formBody = new URLSearchParams({
      product_id: productId,
      license_key: key,
      increment_uses_count: 'false',
    });
    let response: GumroadLicenseResponse;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<GumroadLicenseResponse>(
          this.verifyEndpoint,
          formBody.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 8000,
          },
        ),
      );
      response = data;
    } catch {
      return { ok: false, reason: 'http' };
    }
    if (!response.success || !response.purchase) {
      return { ok: false, reason: 'invalid' };
    }
    if (response.purchase.test) {
      return { ok: true };
    }
    if (response.purchase.chargebacked) {
      return { ok: false, reason: 'chargebacked' };
    }
    if (response.purchase.refunded) {
      return { ok: false, reason: 'refunded' };
    }
    const purchaseEmail = (response.purchase.email ?? '').trim().toLowerCase();
    if (purchaseEmail && purchaseEmail !== user.email.trim().toLowerCase()) {
      return { ok: false, reason: 'email_mismatch' };
    }
    return { ok: true };
  }
}
