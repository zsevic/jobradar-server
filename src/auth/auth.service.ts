import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { GumroadService } from './gumroad.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly gumroadService: GumroadService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async login(payload: LoginDto) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    await this.gumroadService.verifyLicense(
      payload.licenseKey,
      normalizedEmail,
    );
    const existingUser = await this.userRepository.findOneBy({
      email: normalizedEmail,
    });
    const user = await this.userRepository.save({
      id: existingUser?.id,
      email: normalizedEmail,
      licenseKey: payload.licenseKey.trim(),
    });

    const token = await this.jwtService.signAsync({
      sub: normalizedEmail,
      email: normalizedEmail,
      userId: user.id,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: normalizedEmail,
      },
    };
  }
}
