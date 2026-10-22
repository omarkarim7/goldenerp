import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!user) {
      await this.logAttempt(null, dto.username, false, ip, userAgent);
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    if (user.isLocked) {
      throw new ForbiddenException('الحساب مقفل. تواصل مع المدير لفك القفل');
    }

    if (!user.isActive) {
      throw new ForbiddenException('الحساب غير نشط');
    }

    const passwordValid = await argon2.verify(user.password, dto.password);

    if (!passwordValid) {
      const maxAttempts = this.config.get<number>('ACCOUNT_LOCK_ATTEMPTS', 3);
      const newAttempts = user.failedAttempts + 1;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: newAttempts,
          isLocked: newAttempts >= maxAttempts,
        },
      });

      await this.logAttempt(user.id, dto.username, false, ip, userAgent);

      if (newAttempts >= maxAttempts) {
        throw new ForbiddenException('تم قفل الحساب بعد 3 محاولات خاطئة. تواصل مع المدير');
      }

      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lastLogin: new Date() },
    });

    await this.logAttempt(user.id, dto.username, true, ip, userAgent);

    const tokens = await this.generateTokens(user.id, user.username, user.role);

    const permCodes =
      user.role === 'GENERAL_MANAGER' || user.username === 'admin'
        ? ['*']
        : user.permissions.map((p) => p.permission.code);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        allowedCompanies: user.allowedCompanies || 'ALL',
        permissions: permCodes,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive || user.isLocked) {
        throw new UnauthorizedException('رمز التحديث غير صالح');
      }

      return this.generateTokens(user.id, user.username, user.role);
    } catch {
      throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, email: true, fullName: true,
        phone: true, role: true, allowedCompanies: true, lastLogin: true,
        permissions: {
          select: { permission: { select: { code: true, name: true, module: true } } },
        },
      },
    });

    if (!user) throw new UnauthorizedException('المستخدم غير موجود');

    return { ...user, permissions: user.permissions.map((p) => p.permission) };
  }

  private async generateTokens(userId: string, username: string, role: string) {
    const payload = { sub: userId, username, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload as any),
      this.jwt.signAsync(payload as any, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async logAttempt(
    userId: string | null, username: string, success: boolean,
    ip?: string, userAgent?: string,
  ) {
    await this.prisma.loginAttempt.create({
      data: { userId, username, success, ipAddress: ip, userAgent },
    });
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }
}
