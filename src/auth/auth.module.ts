import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GumroadService } from './gumroad.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
            '7d') as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GumroadService],
  exports: [AuthService],
})
export class AuthModule {}
