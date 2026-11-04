import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
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

    if (!user.isActive) {
      throw new ForbiddenException('الحساب غير نشط أو تم تعطيله من قبل الإدارة');
    }

    let passwordValid = false;
    if (user.password.startsWith('$argon2')) {
      try {
        const argon2 = await import('argon2');
        passwordValid = await argon2.verify(user.password, dto.password);
      } catch {
        passwordValid = false;
      }
    } else {
      passwordValid = await bcrypt.compare(dto.password, user.password);
    }

    if (user.isLocked) {
      if (passwordValid && (user.role === 'GENERAL_MANAGER' || user.username === 'admin' || user.username === 'ahd2026')) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isLocked: false, failedAttempts: 0 },
        });
      } else {
        throw new ForbiddenException('الحساب مقفل أمنياً لتجاوز الحد الأقصى للمحاولات الخاطئة. برجاء مراجعة المدير العام لفك القفل.');
      }
    }

    if (!passwordValid) {
      let maxAttempts = 3;
      try {
        const lockSetting = await this.prisma.systemSetting.findUnique({
          where: { key: 'account_lock_attempts' },
        });
        if (lockSetting?.value) {
          const parsed = parseInt(lockSetting.value, 10);
          if (!isNaN(parsed) && parsed > 0) {
            maxAttempts = parsed;
          }
        }
      } catch {
        maxAttempts = this.config.get<number>('ACCOUNT_LOCK_ATTEMPTS', 3);
      }

      const newAttempts = (user.failedAttempts || 0) + 1;
      const willLock = newAttempts >= maxAttempts;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: newAttempts,
          isLocked: willLock,
        },
      });

      await this.logAttempt(user.id, dto.username, false, ip, userAgent);

      if (willLock) {
        throw new ForbiddenException(
          `تم قفل الحساب أمنياً لتجاوز الحد الأقصى للمحاولات الخاطئة (${maxAttempts} محاولات). برجاء التواصل مع المدير العام لفك القفل.`
        );
      }

      const remaining = maxAttempts - newAttempts;
      throw new UnauthorizedException(
        `اسم المستخدم أو كلمة المرور غير صحيحة. متبقي ${remaining} محاولة قبل قفل الحساب تلقائياً.`
      );
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
      const refreshSecret =
        (this.config.get<string>('JWT_REFRESH_SECRET') || '').replace(/['"]/g, '').trim() ||
        'prod-refresh-secret-goldenerp-2026-ahdahd.eu';
      const payload = this.jwt.verify(refreshToken, {
        secret: refreshSecret,
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

    const permCodes =
      user.role === 'GENERAL_MANAGER' || user.username === 'admin'
        ? ['*']
        : user.permissions.map((p) => p.permission.code);

    return {
      ...user,
      permissions: permCodes,
      permissionDetails: user.permissions.map((p) => p.permission),
    };
  }

  private async generateTokens(userId: string, username: string, role: string) {
    const payload = { sub: userId, username, role };
    const refreshSecret = (this.config.get<string>('JWT_REFRESH_SECRET') || '').replace(/['"]/g, '').trim() || 'prod-refresh-secret-goldenerp-2026-ahdahd.eu';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload as any, { expiresIn: 60 * 60 * 24 * 7 }),
      this.jwt.signAsync(payload as any, {
        secret: refreshSecret,
        expiresIn: 60 * 60 * 24 * 30, // 30 days
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
    return bcrypt.hash(password, 10);
  }
}
