import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { GumroadService } from './gumroad.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly gumroadService: GumroadService,
    private readonly jwtService: JwtService,
  ) {}

  async login(payload: LoginDto) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    await this.gumroadService.verifyLicense(
      payload.licenseKey,
      normalizedEmail,
    );

    const token = await this.jwtService.signAsync({
      sub: normalizedEmail,
      email: normalizedEmail,
    });

    return {
      accessToken: token,
      user: {
        email: normalizedEmail,
      },
    };
  }
}
